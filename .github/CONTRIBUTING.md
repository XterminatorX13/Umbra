# Como Contribuir para o PKM ChatGPT (Umbra)

Primeiramente, obrigado pelo seu interesse em contribuir para o nosso PKM! A sua ajuda é essencial para mantermos o app livre de bugs e recheado de funcionalidades incríveis.

## 1. Processo Básico

1. **Faça um Fork** do projeto e clone-o localmente.
2. **Crie uma Branch** para sua feature ou correção (`git checkout -b feature/MinhaFeatureIncrivel`).
3. **Desenvolva e Teste**: certifique-se de não quebrar funcionalidades existentes ou gerar warnings (rodando `npm run dev`).
4. **Faça os Commits** (`git commit -m 'feat: adiciona nova funcionalidade incrível'`).
5. **Faça o Push** para a sua branch (`git push origin feature/MinhaFeatureIncrivel`).
6. **Abra um Pull Request**, preenchendo as informações solicitadas no nosso template de PR.

## 2. Reportando Bugs ou Solicitando Funcionalidades

Sempre confira a aba *Issues* para ver se alguém já não reportou a mesma ideia ou problema. 
Caso não encontre, sinta-se à vontade para abrir uma nova issue utilizando os **Templates de Issue** que configuramos (`.github/ISSUE_TEMPLATE`).

## 3. Padrões de Código e UI

- Este é um aplicativo Electron/Svelte. Procure manter os componentes organizados na pasta correta (`src/lib/components/`).
- O tema é **Dark Aurora**. Novos botões, menus e layouts devem seguir o padrão estético dos componentes existentes. Confira `COMPONENTS.md` e `SHADCN-INTEGRATION.md` para mais informações.
- Preocupe-se com *Memory Leaks*! Ao adicionar Event Listeners, lembre-se de adicionar `onDestroy` e limpá-los, conforme documentado em `MEMORY-LEAKS.md`.

## 4. Testando o Build Final

Antes de submeter um PR, recomendamos testar se o build local não sofreu regressões:

```bash
npm run build
npm run electron:build:win
```

Se o executável for gerado com sucesso na pasta `release/`, significa que seu código passou pelo crivo inicial do bundler.
Agradecemos a sua contribuição!
