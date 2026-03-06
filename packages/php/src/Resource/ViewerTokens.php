<?php

declare(strict_types=1);

namespace LogSeal\Resource;

use LogSeal\LogSeal;

class ViewerTokens
{
    public function __construct(private readonly LogSeal $client) {}

    /**
     * Create a short-lived viewer token for the embeddable log viewer.
     */
    public function create(string $organizationId, ?int $expiresIn = null): array
    {
        $body = ['organization_id' => $organizationId];
        if ($expiresIn !== null) $body['expires_in'] = $expiresIn;
        return $this->client->request('POST', '/v1/viewer-tokens', $body);
    }
}
