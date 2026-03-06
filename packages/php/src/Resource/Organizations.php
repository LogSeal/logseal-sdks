<?php

declare(strict_types=1);

namespace LogSeal\Resource;

use LogSeal\LogSeal;

class Organizations
{
    public function __construct(private readonly LogSeal $client) {}

    public function list(): array
    {
        return $this->client->request('GET', '/v1/organizations');
    }

    public function create(string $externalId, ?string $name = null): array
    {
        $body = ['external_id' => $externalId];
        if ($name !== null) $body['name'] = $name;
        return $this->client->request('POST', '/v1/organizations', $body);
    }

    public function get(string $id): array
    {
        return $this->client->request('GET', "/v1/organizations/{$id}");
    }
}
