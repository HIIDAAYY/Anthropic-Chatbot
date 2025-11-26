#!/bin/bash
curl -X POST 'https://customer-support-agent-alpha.vercel.app/api/admin/conversation/cmifmfjf90003jo04uqiatrnp/resolve?key=123456' \
  -H 'Content-Type: application/json' \
  -d '{"resolvedBy":"Test User","notes":"Test resolution"}'
