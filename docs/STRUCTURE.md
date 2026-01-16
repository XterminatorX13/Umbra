# Estrutura do Projeto - Aurora Chat Manager

## Organização de Pastas

```
src/lib/
├── components/    # Componentes de UI
│   ├── ui/        # Design System básico (Button, Card, Badge, etc.)
│   ├── features/  # Componentes de negócio (FilterPanel, Calendar, etc.)
│   └── layout/    # Componentes estruturais (EmptyState, VirtualList)
│
├── containers/    # Páginas/Views principais da aplicação
│   ├── Sidebar.svelte      # Navegação e lista de conversas
│   ├── ChatView.svelte     # Visualização de mensagens
│   └── MainArea.svelte     # Área principal de conteúdo
│
├── stores/        # Estado global (Svelte stores)
│   └── index.js            # Toasts e outros estados globais
│
├── services/      # Camada de persistência e APIs
│   └── database.js         # IndexedDB via Dexie.js
│
├── actions/       # Svelte use:actions
│   └── portal.js           # Portal DOM manipulation
│
├── utils/         # Funções auxiliares
│   ├── data.js             # Formatação de dados e conversas
│   ├── cn.ts               # Utilidade de classes CSS
│   ├── markdown.js         # Parser de markdown
│   ├── debounce.js         # Debouncing
│   ├── perfMonitor.js      # Monitoramento de performance
│   └── virtualScroll.js    # Scroll virtualizado
│
└── styles/        # CSS global
    └── markdown.css        # Estilos para markdown

docs/              # Documentação
tests/             # Testes (Bun)
benchmarks/        # Benchmarks de performance
electron/          # Electron main process
```

## Comandos Disponíveis

| Comando | Descrição |
| ------- | --------- |
| `bun run dev` | Servidor de desenvolvimento |
| `bun run build` | Build SPA/PWA otimizado |
| `bun run build:standalone` | Build HTML único (~2.6MB) |
| `bun run electron:build:win` | Build executável Windows |

## Princípios da Organização

1. **Separação de Responsabilidades**: Cada pasta tem um propósito claro.
2. **Escalabilidade**: Fácil adicionar novos componentes/features.
3. **Manutenibilidade**: Código organizado facilita manutenção.
4. **Testabilidade**: Estrutura modular facilita testes isolados.
