<?php

declare(strict_types=1);

namespace LogSeal\Resource;

use LogSeal\LogSeal;

class Events
{
    public function __construct(private readonly LogSeal $client) {}

    /**
     * List events with filtering and pagination.
     *
     * @param array{
     *     organization_id: string,
     *     action?: string,
     *     action_prefix?: string,
     *     actor_id?: string,
     *     target_type?: string,
     *     target_id?: string,
     *     after?: string,
     *     before?: string,
     *     search?: string,
     *     limit?: int,
     *     cursor?: string,
     * } $params
     * @return array Paginated list of events.
     */
    public function list(array $params): array
    {
        return $this->client->request('GET', '/v1/events', null, $params);
    }

    /**
     * Retrieve a single event by ID.
     */
    public function get(string $eventId): array
    {
        return $this->client->request('GET', "/v1/events/{$eventId}");
    }

    /**
     * Verify hash-chain integrity for an organization.
     */
    public function verify(string $organizationId, ?string $after = null, ?string $before = null): array
    {
        $body = ['organization_id' => $organizationId];
        if ($after !== null) $body['after'] = $after;
        if ($before !== null) $body['before'] = $before;
        return $this->client->request('POST', '/v1/events/verify', $body);
    }

    /**
     * Verify a specific sequence range.
     */
    public function verifyRange(string $organizationId, int $fromSequence, int $toSequence): array
    {
        return $this->client->request('POST', '/v1/events/verify-range', [
            'organization_id' => $organizationId,
            'from_sequence' => $fromSequence,
            'to_sequence' => $toSequence,
        ]);
    }

    /**
     * Retrieve the Merkle proof for an event.
     */
    public function getProof(string $eventId): array
    {
        return $this->client->request('GET', "/v1/events/{$eventId}/proof");
    }

    /**
     * Auto-paginate through all matching events.
     *
     * @return \Generator<int, array> Yields individual event arrays.
     */
    public function listAll(array $params): \Generator
    {
        $cursor = null;
        do {
            if ($cursor !== null) {
                $params['cursor'] = $cursor;
            }
            $page = $this->list($params);
            foreach ($page['data'] as $event) {
                yield $event;
            }
            $cursor = $page['next_cursor'] ?? null;
        } while (!empty($page['has_more']) && $cursor !== null);
    }
}
