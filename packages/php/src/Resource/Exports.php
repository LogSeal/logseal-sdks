<?php

declare(strict_types=1);

namespace LogSeal\Resource;

use LogSeal\Exception\LogSealException;
use LogSeal\LogSeal;

class Exports
{
    public function __construct(private readonly LogSeal $client) {}

    /**
     * Start a new export job.
     */
    public function create(string $organizationId, string $format, ?array $filters = null): array
    {
        $body = ['organization_id' => $organizationId, 'format' => $format];
        if ($filters !== null) $body['filters'] = $filters;
        return $this->client->request('POST', '/v1/exports', $body);
    }

    /**
     * Check the status of an export job.
     */
    public function get(string $id): array
    {
        return $this->client->request('GET', "/v1/exports/{$id}");
    }

    /**
     * Poll an export until it completes or fails.
     *
     * @param string $id Export job ID.
     * @param float $intervalSeconds Seconds between polls (default 1).
     * @param float $timeoutSeconds Maximum seconds to wait (default 60).
     */
    public function poll(string $id, float $intervalSeconds = 1.0, float $timeoutSeconds = 60.0): array
    {
        $start = microtime(true);
        while (microtime(true) - $start < $timeoutSeconds) {
            $export = $this->get($id);
            if (in_array($export['status'], ['completed', 'failed'], true)) {
                return $export;
            }
            usleep((int) ($intervalSeconds * 1_000_000));
        }

        throw new LogSealException(
            type: 'internal_error',
            code: 'export_timeout',
            message: 'Export did not complete within the timeout period.',
        );
    }
}
