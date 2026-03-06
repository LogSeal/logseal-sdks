<?php

declare(strict_types=1);

namespace LogSeal;

use GuzzleHttp\Client as HttpClient;
use GuzzleHttp\Exception\ClientException;
use GuzzleHttp\Exception\ServerException;
use LogSeal\Exception\LogSealException;
use LogSeal\Resource\Events;
use LogSeal\Resource\Organizations;
use LogSeal\Resource\Schemas;
use LogSeal\Resource\ViewerTokens;
use LogSeal\Resource\Webhooks;
use LogSeal\Resource\Exports;

/**
 * Client for the LogSeal audit-logging API.
 *
 * ```php
 * $client = new \LogSeal\LogSeal('sk_test_...');
 * $client->emit([
 *     'action' => 'user.login',
 *     'organization_id' => 'org_acme',
 *     'actor' => ['id' => 'user_123'],
 * ]);
 * $client->shutdown();
 * ```
 */
class LogSeal
{
    private const VERSION = '0.1.1';
    private const DEFAULT_BASE_URL = 'https://api.logseal.io';
    private const DEFAULT_BATCH_SIZE = 100;
    private const DEFAULT_FLUSH_INTERVAL = 5;
    private const DEFAULT_MAX_RETRIES = 3;

    private HttpClient $http;
    private string $apiKey;
    private string $baseUrl;
    private int $batchSize;
    private int $maxRetries;

    /** @var array<int, array<string, mixed>> */
    private array $queue = [];

    public readonly Events $events;
    public readonly Organizations $organizations;
    public readonly Schemas $schemas;
    public readonly ViewerTokens $viewerTokens;
    public readonly Webhooks $webhooks;
    public readonly Exports $exports;

    /**
     * @param string $apiKey Your LogSeal API key.
     * @param array{
     *     base_url?: string,
     *     batch_size?: int,
     *     max_retries?: int,
     *     timeout?: int,
     * } $options
     */
    public function __construct(string $apiKey, array $options = [])
    {
        if ($apiKey === '') {
            throw new \InvalidArgumentException('API key is required');
        }

        $this->apiKey = $apiKey;
        $this->baseUrl = $options['base_url'] ?? self::DEFAULT_BASE_URL;
        $this->batchSize = $options['batch_size'] ?? self::DEFAULT_BATCH_SIZE;
        $this->maxRetries = $options['max_retries'] ?? self::DEFAULT_MAX_RETRIES;

        $this->http = new HttpClient([
            'base_uri' => $this->baseUrl,
            'timeout' => $options['timeout'] ?? 30,
            'headers' => [
                'Authorization' => 'Bearer ' . $this->apiKey,
                'Content-Type' => 'application/json',
                'User-Agent' => 'logseal-php/' . self::VERSION,
            ],
        ]);

        $this->events = new Events($this);
        $this->organizations = new Organizations($this);
        $this->schemas = new Schemas($this);
        $this->viewerTokens = new ViewerTokens($this);
        $this->webhooks = new Webhooks($this);
        $this->exports = new Exports($this);
    }

    /**
     * Queue an event for batched delivery.
     *
     * @param array{
     *     action: string,
     *     organization_id: string,
     *     actor: array{id: string, type?: string, name?: string, email?: string, metadata?: array},
     *     targets?: array<array{type: string, id: string, name?: string, metadata?: array}>,
     *     metadata?: array,
     *     context?: array{ip_address?: string, user_agent?: string, request_id?: string},
     *     occurred_at?: string,
     *     idempotency_key?: string,
     * } $event
     * @return array{status: string}
     */
    public function emit(array $event): array
    {
        $this->validateEvent($event);
        $this->queue[] = $event;

        if (count($this->queue) >= $this->batchSize) {
            $this->flush();
        }

        return ['status' => 'queued'];
    }

    /**
     * Emit a single event and wait for server confirmation.
     *
     * @return array The created event record.
     */
    public function emitSync(array $event): array
    {
        $this->validateEvent($event);
        return $this->request('POST', '/v1/events', $this->formatEvent($event));
    }

    /**
     * Flush all queued events immediately.
     *
     * @return int Number of events accepted.
     */
    public function flush(): int
    {
        if (empty($this->queue)) {
            return 0;
        }

        $batch = $this->queue;
        $this->queue = [];

        try {
            $body = ['events' => array_map(fn($e) => $this->formatEvent($e), $batch)];
            $resp = $this->request('POST', '/v1/events/batch', $body);
            return $resp['accepted'] ?? 0;
        } catch (\Throwable $e) {
            $this->queue = array_merge($batch, $this->queue);
            throw $e;
        }
    }

    /**
     * Flush remaining events. Call before process exit.
     */
    public function shutdown(): void
    {
        $this->flush();
    }

    /**
     * @internal
     *
     * @return array<string, mixed>
     */
    public function request(string $method, string $path, ?array $body = null, ?array $query = null): array
    {
        return $this->doRequest($method, $path, $body, $query, 0);
    }

    /**
     * @return array<string, mixed>
     */
    private function doRequest(string $method, string $path, ?array $body, ?array $query, int $retry): array
    {
        $options = [];
        if ($body !== null) {
            $options['json'] = $body;
        }
        if ($query !== null) {
            $options['query'] = array_filter($query, fn($v) => $v !== null);
        }

        try {
            $response = $this->http->request($method, $path, $options);
            $data = json_decode((string) $response->getBody(), true);
            return $data ?? [];
        } catch (ServerException $e) {
            if ($retry < $this->maxRetries) {
                $delay = min(1000 * (2 ** $retry), 30000);
                $jitter = (int) ($delay * 0.2 * (mt_rand() / mt_getrandmax()));
                usleep(($delay + $jitter) * 1000);
                return $this->doRequest($method, $path, $body, $query, $retry + 1);
            }
            $this->throwApiError($e->getResponse()->getBody()->getContents(), $e->getResponse()->getStatusCode());
        } catch (ClientException $e) {
            $status = $e->getResponse()->getStatusCode();
            if ($status === 429 && $retry < $this->maxRetries) {
                $delay = min(1000 * (2 ** $retry), 30000);
                usleep($delay * 1000);
                return $this->doRequest($method, $path, $body, $query, $retry + 1);
            }
            $this->throwApiError($e->getResponse()->getBody()->getContents(), $status);
        }

        return []; // unreachable
    }

    /**
     * @return never
     */
    private function throwApiError(string $body, int $statusCode): void
    {
        $data = json_decode($body, true);
        $err = $data['error'] ?? [];
        throw new LogSealException(
            type: $err['type'] ?? 'internal_error',
            code: $err['code'] ?? 'unknown',
            message: $err['message'] ?? 'Unknown error',
            param: $err['param'] ?? null,
            docUrl: $err['doc_url'] ?? null,
            statusCode: $statusCode,
        );
    }

    private function validateEvent(array $event): void
    {
        if (empty($event['action'])) {
            throw new LogSealException(
                type: 'validation_error', code: 'missing_required_field',
                message: "The 'action' field is required.", param: 'action',
            );
        }
        if (empty($event['actor']['id'])) {
            throw new LogSealException(
                type: 'validation_error', code: 'missing_required_field',
                message: "The 'actor.id' field is required.", param: 'actor.id',
            );
        }
        if (empty($event['organization_id'])) {
            throw new LogSealException(
                type: 'validation_error', code: 'missing_required_field',
                message: "The 'organization_id' field is required.", param: 'organization_id',
            );
        }
    }

    /**
     * @return array<string, mixed>
     */
    private function formatEvent(array $event): array
    {
        $payload = [
            'action' => $event['action'],
            'organization_id' => $event['organization_id'],
            'actor' => array_filter($event['actor'], fn($v) => $v !== null),
        ];
        if (!empty($event['targets'])) {
            $payload['targets'] = array_map(fn($t) => array_filter($t, fn($v) => $v !== null), $event['targets']);
        }
        if (!empty($event['metadata'])) {
            $payload['metadata'] = $event['metadata'];
        }
        if (!empty($event['context'])) {
            $payload['context'] = array_filter([
                'ip_address' => $event['context']['ip_address'] ?? null,
                'user_agent' => $event['context']['user_agent'] ?? null,
                'request_id' => $event['context']['request_id'] ?? null,
            ], fn($v) => $v !== null);
        }
        if (!empty($event['occurred_at'])) {
            $payload['occurred_at'] = $event['occurred_at'];
        }
        if (!empty($event['idempotency_key'])) {
            $payload['idempotency_key'] = $event['idempotency_key'];
        }
        return $payload;
    }
}
