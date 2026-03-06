import { useState } from 'react';
import { formatDateTime } from '@logseal/viewer-core';
import type { EventDetailProps } from '../types.js';

export function EventDetail({ event, className }: EventDetailProps) {
  const [hashExpanded, setHashExpanded] = useState(false);

  return (
    <div className={`logseal-detail ${className || ''}`}>
      <div className="logseal-detail__section">
        <h4 className="logseal-detail__heading">Actor</h4>
        <dl className="logseal-detail__list">
          <dt>ID</dt>
          <dd>{event.actor.id}</dd>
          <dt>Type</dt>
          <dd>{event.actor.type}</dd>
          {event.actor.name && (
            <>
              <dt>Name</dt>
              <dd>{event.actor.name}</dd>
            </>
          )}
          {event.actor.email && (
            <>
              <dt>Email</dt>
              <dd>{event.actor.email}</dd>
            </>
          )}
        </dl>
      </div>

      {event.targets.length > 0 && (
        <div className="logseal-detail__section">
          <h4 className="logseal-detail__heading">Targets</h4>
          {event.targets.map((target, i) => (
            <dl key={i} className="logseal-detail__list">
              <dt>Type</dt>
              <dd>{target.type}</dd>
              <dt>ID</dt>
              <dd>{target.id}</dd>
              {target.name && (
                <>
                  <dt>Name</dt>
                  <dd>{target.name}</dd>
                </>
              )}
            </dl>
          ))}
        </div>
      )}

      {Object.keys(event.metadata).length > 0 && (
        <div className="logseal-detail__section">
          <h4 className="logseal-detail__heading">Metadata</h4>
          <pre className="logseal-detail__code">
            {JSON.stringify(event.metadata, null, 2)}
          </pre>
        </div>
      )}

      {(event.context.ip_address || event.context.user_agent || event.context.request_id) && (
        <div className="logseal-detail__section">
          <h4 className="logseal-detail__heading">Context</h4>
          <dl className="logseal-detail__list">
            {event.context.ip_address && (
              <>
                <dt>IP Address</dt>
                <dd>{event.context.ip_address}</dd>
              </>
            )}
            {event.context.user_agent && (
              <>
                <dt>User Agent</dt>
                <dd>{event.context.user_agent}</dd>
              </>
            )}
            {event.context.request_id && (
              <>
                <dt>Request ID</dt>
                <dd>{event.context.request_id}</dd>
              </>
            )}
          </dl>
        </div>
      )}

      <div className="logseal-detail__section">
        <h4 className="logseal-detail__heading">Integrity</h4>
        <dl className="logseal-detail__list">
          <dt>Event Hash</dt>
          <dd>
            <code
              className={`logseal-detail__hash ${hashExpanded ? 'logseal-detail__hash--expanded' : ''}`}
              onClick={() => setHashExpanded((v) => !v)}
              title={hashExpanded ? 'Click to collapse' : 'Click to expand'}
            >
              {event.event_hash}
            </code>
          </dd>
          <dt>Occurred At</dt>
          <dd>{formatDateTime(event.occurred_at)}</dd>
          <dt>Received At</dt>
          <dd>{formatDateTime(event.received_at)}</dd>
        </dl>
      </div>
    </div>
  );
}
