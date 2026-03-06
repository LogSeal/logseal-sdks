<?php

declare(strict_types=1);

namespace LogSeal\Exception;

/**
 * Thrown when the LogSeal API returns an error response.
 */
class LogSealException extends \RuntimeException
{
    public readonly string $type;
    public readonly string $errorCode;
    public readonly ?string $param;
    public readonly ?string $docUrl;
    public readonly int $statusCode;

    public function __construct(
        string $type,
        string $code,
        string $message,
        ?string $param = null,
        ?string $docUrl = null,
        int $statusCode = 400,
    ) {
        parent::__construct($message, $statusCode);
        $this->type = $type;
        $this->errorCode = $code;
        $this->param = $param;
        $this->docUrl = $docUrl;
        $this->statusCode = $statusCode;
    }

    public function getErrorCode(): string
    {
        return $this->errorCode;
    }

    public function __toString(): string
    {
        return sprintf('[%s] %s: %s', $this->type, $this->errorCode, $this->getMessage());
    }
}
