<?php

declare(strict_types=1);

namespace LogSeal\Resource;

use LogSeal\LogSeal;

class Webhooks
{
    public function __construct(private readonly LogSeal $client) {}

    public function list(): array
    {
        return $this->client->request('GET', '/v1/webhooks');
    }

    /**
     * Create a new webhook. The signing secret is only returned once.
     */
    public function create(string $url, ?string $organizationId = null, ?array $events = null, ?bool $enabled = null): array
    {
        $body = ['url' => $url];
        if ($organizationId !== null) $body['organization_id'] = $organizationId;
        if ($events !== null) $body['events'] = $events;
        if ($enabled !== null) $body['enabled'] = $enabled;
        return $this->client->request('POST', '/v1/webhooks', $body);
    }

    public function get(string $id): array
    {
        return $this->client->request('GET', "/v1/webhooks/{$id}");
    }

    public function update(string $id, array $fields): array
    {
        return $this->client->request('PATCH', "/v1/webhooks/{$id}", $fields);
    }

    public function delete(string $id): void
    {
        $this->client->request('DELETE', "/v1/webhooks/{$id}");
    }
}
