<?php

declare(strict_types=1);

namespace LogSeal\Resource;

use LogSeal\LogSeal;

class Schemas
{
    public function __construct(private readonly LogSeal $client) {}

    public function list(): array
    {
        return $this->client->request('GET', '/v1/schemas');
    }

    public function create(string $action, ?string $description = null, ?array $targetTypes = null, ?array $metadataSchema = null): array
    {
        $body = ['action' => $action];
        if ($description !== null) $body['description'] = $description;
        if ($targetTypes !== null) $body['target_types'] = $targetTypes;
        if ($metadataSchema !== null) $body['metadata_schema'] = $metadataSchema;
        return $this->client->request('POST', '/v1/schemas', $body);
    }

    public function get(string $id): array
    {
        return $this->client->request('GET', "/v1/schemas/{$id}");
    }

    public function update(string $id, array $fields): array
    {
        return $this->client->request('PATCH', "/v1/schemas/{$id}", $fields);
    }

    public function delete(string $id): void
    {
        $this->client->request('DELETE', "/v1/schemas/{$id}");
    }
}
