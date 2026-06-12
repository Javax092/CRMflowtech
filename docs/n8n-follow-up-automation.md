# Automação de follow-ups via n8n

Este fluxo busca follow-ups comerciais vencidos ou agendados para agora, envia a mensagem pelo WhatsApp via Evolution API e confirma o envio no FlowCRM.

## Variáveis necessárias

No FlowCRM:

```env
AUTOMATION_SECRET="um-segredo-forte"
FOLLOW_UP_DAILY_LIMIT=15
```

No n8n, configure a variável de ambiente:

```env
AUTOMATION_SECRET="mesmo-valor-do-flowcrm"
```

## Endpoints do FlowCRM

Listar follow-ups elegíveis:

```http
GET http://localhost:3000/api/automation/follow-ups/due?limit=15
x-automation-secret: {{$env.AUTOMATION_SECRET}}
```

Confirmar envio:

```http
POST http://localhost:3000/api/automation/follow-ups/{{$json.id}}/sent
x-automation-secret: {{$env.AUTOMATION_SECRET}}
Content-Type: application/json

{
  "provider": "evolution-api",
  "messageId": "{{$json.key.id}}",
  "sentAt": "{{$now}}"
}
```

Registrar falha sem marcar como enviado:

```http
POST http://localhost:3000/api/automation/follow-ups/{{$json.id}}/failed
x-automation-secret: {{$env.AUTOMATION_SECRET}}
Content-Type: application/json

{
  "provider": "evolution-api",
  "messageId": "{{$json.key.id}}",
  "error": "{{$json.error.message || 'Falha ao enviar mensagem'}}",
  "failedAt": "{{$now}}"
}
```

## Regras de elegibilidade

O endpoint `/due` retorna apenas leads com:

- `followUpSequenceStatus = ACTIVE`
- `nextFollowUpAt <= agora`
- `pipelineStage = MENSAGEM_ENVIADA`
- WhatsApp preenchido
- `followUpCount < followUpSequenceLength`

A ordenação é:

1. follow-ups mais atrasados primeiro
2. maior `followUpCount`
3. maior `proposedValue`

O limite padrão é `FOLLOW_UP_DAILY_LIMIT=15`. O parâmetro `?limit=15` pode sobrescrever o valor, mas o CRM nunca retorna mais de 30 contatos por execução.

## Workflow n8n

### 1. Cron

Crie um nó **Cron**:

- Executar de segunda a sexta
- Horário: `09:00`
- Opcional: criar uma segunda execução às `15:00`

### 2. HTTP Request: buscar follow-ups

Nó **HTTP Request**:

- Method: `GET`
- URL: `http://localhost:3000/api/automation/follow-ups/due?limit=15`
- Headers:
  - `x-automation-secret`: `{{$env.AUTOMATION_SECRET}}`

Resposta esperada:

```json
[
  {
    "id": "lead_id",
    "name": "Nome do lead",
    "phone": "5592999999999",
    "followUpCount": 0,
    "followUpSequenceLength": 3,
    "nextFollowUpNumber": 1,
    "message": "mensagem pronta para envio",
    "pipelineStage": "MENSAGEM_ENVIADA"
  }
]
```

### 3. Split In Batches

Nó **Split In Batches**:

- `batchSize = 1`

Isso evita repetir o mesmo lead dentro da mesma execução e permite tratar erro lead a lead.

### 4. Wait

Nó **Wait** entre cada envio:

- Esperar entre 60 e 180 segundos

Você pode usar um tempo fixo, por exemplo 90 segundos, ou uma expressão para randomizar.

### 5. HTTP Request: enviar pela Evolution API

Nó **HTTP Request**:

- Method: `POST`
- URL: `http://localhost:8080/message/sendText/NOME_DA_INSTANCIA`
- Headers:
  - `apikey`: `SUA_EVOLUTION_API_KEY`
  - `Content-Type`: `application/json`
- Body:

```json
{
  "number": "{{$json.phone}}",
  "text": "{{$json.message}}"
}
```

Configure o nó para continuar em caso de erro e direcione falhas para o nó de registro de falha.

### 6. HTTP Request: confirmar no CRM

Conecte este nó apenas no caminho de sucesso da Evolution API.

- Method: `POST`
- URL: `http://localhost:3000/api/automation/follow-ups/{{$json.id}}/sent`
- Headers:
  - `x-automation-secret`: `{{$env.AUTOMATION_SECRET}}`
  - `Content-Type`: `application/json`
- Body:

```json
{
  "provider": "evolution-api",
  "messageId": "{{$json.key.id}}",
  "sentAt": "{{$now}}"
}
```

### 7. HTTP Request: registrar falha

Conecte este nó no caminho de erro da Evolution API.

- Method: `POST`
- URL: `http://localhost:3000/api/automation/follow-ups/{{$json.id}}/failed`
- Headers:
  - `x-automation-secret`: `{{$env.AUTOMATION_SECRET}}`
  - `Content-Type`: `application/json`
- Body:

```json
{
  "provider": "evolution-api",
  "error": "Falha no envio pela Evolution API",
  "failedAt": "{{$now}}"
}
```

## Validação

Depois de uma execução, confirme no banco:

```sql
SELECT id, "followUpCount", "lastFollowUpAt", "nextFollowUpAt", "followUpSequenceStatus"
FROM "Lead"
WHERE "lastFollowUpAt"::date = CURRENT_DATE
ORDER BY "lastFollowUpAt" DESC
LIMIT 30;
```

E confira o histórico:

```sql
SELECT "leadId", type, source, provider, "messageId", "sentAt", "createdAt"
FROM "ContactHistory"
WHERE type IN ('FOLLOW_UP_AUTOMATION_QUEUED', 'FOLLOW_UP_SENT_AUTOMATION', 'FOLLOW_UP_SEND_FAILED', 'FOLLOW_UP_SEQUENCE_COMPLETED')
ORDER BY "createdAt" DESC
LIMIT 50;
```
