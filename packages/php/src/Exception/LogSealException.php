<?php

declare(strict_types=1);

namespace LogSeal\Exception;

/**
 * Thrown when the LogSeal API returns an error response.
 */
class LogSealException extends \RuntimeException
{
    public function __construct(
        public readonly string $type,
        public readonly string $code,
        string $message,
        public readonly ?string $param = null,
        public readonly ?string $docUrl = null,
        public readonly int $statusCode = 400,
    ) {
        parent::__construct($message, $statusCode);
    }

    public function __toString(): string
    {
        return sprintf('[%s] %s: %s', $this->type, $this->code, $this->getMessage());
    }
}
