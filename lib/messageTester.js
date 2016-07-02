// This module is for sending sample messages to the service in order to test, and is not used in production at all.

'use static';

module.exports = {
    'messages': [
        {
            "payload": {
                "event_name":"MetagameEvent",
                "experience_bonus":"30.000000",
                "faction_nc":"41.176472",
                "faction_tr":"39.607845",
                "faction_vs":"16.862745",
                "instance_id":"8403",
                "metagame_event_id":"2",
                "metagame_event_state":"135",
                "metagame_event_state_name":"started",
                "timestamp":"1467419946",
                "world_id":"10"
            },
            "service":"event",
            "type":"serviceMessage"
        }
    ]
}
