# charlie | FOR BUSINESS — Ritual Semanal

App de ritual semanal para o time Field Sales B2B da Charlie.

## Estrutura

```
/
├── index.html          # App completo (single-file)
├── README.md           # Este arquivo
└── apps-script/
    └── Code.gs         # Google Apps Script (backend / planilha)
```

## Como funciona

- **Frontend**: `index.html` hospedado no Netlify — single-file, sem dependências externas
- **Backend**: Google Apps Script conectado ao Google Sheets
- **Dados**: salvos no Google Sheets em abas separadas (Closer, Cs, Vip)

## Perfis

| Perfil | Função |
|--------|--------|
| Closer | Prospecção e ativação de novos clientes |
| CS | Retenção, expansão e visitas presenciais |
| VIP | Experiência premium e vistorias |
| Líder | Dashboard consolidado com visão de todas as frentes |

## Deploy

### Netlify
1. Acesse [netlify.com](https://netlify.com)
2. Arraste o arquivo `index.html` na área de deploy
3. Pronto — o link gerado é o app

### Google Apps Script
1. Acesse [script.google.com](https://script.google.com)
2. Crie um novo projeto vinculado ao Google Sheets da planilha
3. Cole o conteúdo de `apps-script/Code.gs`
4. Clique em **Implantar → Nova implantação → App da Web**
5. Permissões: executar como **Eu**, acesso para **Qualquer pessoa**
6. Copie a URL gerada e cole em `index.html` na variável `SCRIPT_URL`

## Variável de configuração

No `index.html`, linha 1 do script:

```javascript
var SCRIPT_URL = 'SUA_URL_DO_APPS_SCRIPT_AQUI';
```

## Funcionalidades

- Formulários por função com auto-save local
- Badges de status nas abas (verde/amarelo/vermelho)
- Resumo pré-envio antes de confirmar
- Dashboard do líder com dados da planilha em tempo real
- Modo apresentação — blocos por frente (Closer → CS → VIP) para reunião de sexta
- Seletor de semana para navegar entre semanas anteriores
- Acumulado mensal com taxa de conversão
- Gráfico de evolução das últimas semanas
- Linha do tempo da semana com badge "hoje"

## Semana

O app calcula automaticamente a semana atual (segunda a sexta). Preenchimentos feitos no sábado ou domingo avançam para a próxima segunda.
