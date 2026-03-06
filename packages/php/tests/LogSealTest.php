<?php

declare(strict_types=1);

namespace LogSeal\Tests;

use LogSeal\LogSeal;
use LogSeal\Exception\LogSealException;
use PHPUnit\Framework\TestCase;

class LogSealTest extends TestCase
{
    public function testRequiresApiKey(): void
    {
        $this->expectException(\InvalidArgumentException::class);
        new LogSeal('');
    }

    public function testEmitQueuesEvent(): void
    {
        $client = new LogSeal('sk_test_abc', ['base_url' => 'https://api.logseal.io']);
        $result = $client->emit([
            'action' => 'user.login',
            'organization_id' => 'org_1',
            'actor' => ['id' => 'u1'],
        ]);
        $this->assertEquals(['status' => 'queued'], $result);
    }

    public function testValidatesAction(): void
    {
        $client = new LogSeal('sk_test_abc');
        $this->expectException(LogSealException::class);
        $this->expectExceptionMessage('action');
        $client->emit([
            'action' => '',
            'organization_id' => 'org_1',
            'actor' => ['id' => 'u1'],
        ]);
    }

    public function testValidatesActorId(): void
    {
        $client = new LogSeal('sk_test_abc');
        $this->expectException(LogSealException::class);
        $this->expectExceptionMessage('actor.id');
        $client->emit([
            'action' => 'test',
            'organization_id' => 'org_1',
            'actor' => ['id' => ''],
        ]);
    }

    public function testValidatesOrganizationId(): void
    {
        $client = new LogSeal('sk_test_abc');
        $this->expectException(LogSealException::class);
        $this->expectExceptionMessage('organization_id');
        $client->emit([
            'action' => 'test',
            'organization_id' => '',
            'actor' => ['id' => 'u1'],
        ]);
    }

    public function testFlushEmptyQueue(): void
    {
        $client = new LogSeal('sk_test_abc');
        $this->assertEquals(0, $client->flush());
    }

    public function testExceptionProperties(): void
    {
        $e = new LogSealException(
            type: 'authentication_error',
            code: 'invalid_api_key',
            message: 'Invalid API key',
            statusCode: 401,
        );
        $this->assertEquals('authentication_error', $e->type);
        $this->assertEquals('invalid_api_key', $e->code);
        $this->assertEquals('Invalid API key', $e->getMessage());
        $this->assertEquals(401, $e->statusCode);
    }
}
