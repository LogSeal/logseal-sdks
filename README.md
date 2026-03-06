# LogSeal SDKs

Official SDKs for [LogSeal](https://logseal.io) — Audit logging for B2B SaaS.

## SDKs

| SDK | Package | Install | Registry |
| --- | --- | --- | --- |
| [Node.js](./packages/node) | `@logseal/node` | `npm install @logseal/node` | [![npm](https://img.shields.io/npm/v/@logseal/node)](https://www.npmjs.com/package/@logseal/node) |
| [Python](./packages/python) | `logseal` | `pip install logseal` | [![PyPI](https://img.shields.io/pypi/v/logseal)](https://pypi.org/project/logseal/) |
| [Go](./packages/go/logseal) | `logseal-go` | `go get github.com/LogSeal/logseal-go` | [![Go](https://img.shields.io/github/v/tag/LogSeal/logseal-go?label=go)](https://github.com/LogSeal/logseal-go) |
| [Java](./packages/java) | `io.logseal:logseal-java` | Maven/Gradle | [![Maven](https://img.shields.io/maven-central/v/io.logseal/logseal-java)](https://central.sonatype.com/artifact/io.logseal/logseal-java) |
| [Ruby](./packages/ruby) | `logseal` | `gem install logseal` | [![Gem](https://img.shields.io/gem/v/logseal)](https://rubygems.org/gems/logseal) |
| [PHP](./packages/php) | `logseal/logseal-php` | `composer require logseal/logseal-php` | [![Packagist](https://img.shields.io/packagist/v/logseal/logseal-php)](https://packagist.org/packages/logseal/logseal-php) |

## Frontend

| Package | Description | Install |
| --- | --- | --- |
| [`@logseal/viewer-core`](./packages/viewer-core) | Headless viewer engine | `npm install @logseal/viewer-core` |
| [`@logseal/react`](./packages/react) | React audit log viewer | `npm install @logseal/react` |

## Development

```bash
npm install
npx turbo build
npx turbo test
```

## License

MIT
