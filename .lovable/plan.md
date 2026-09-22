# Catálogo, fornecedores e ofertas reais

## Objetivo
Completar o núcleo operacional que alimenta o dashboard, preservando autenticação, papéis e identidade visual existentes.

## Dados
- Aproveitar as tabelas atuais `produtos`, `fornecedores` e `ofertas`, sem criar equivalentes duplicados.
- Evoluir `produtos` para separar modelos e variantes: cada produto representa um modelo; uma nova tabela de variantes guarda capacidade, cor e condição.
- Evoluir fornecedores com tabelas próprias de contatos e endereços.
- Fazer ofertas apontarem para uma variante e registrar cada alteração de preço em histórico.
- Migrar os campos e vínculos atuais de forma aditiva, mantendo os dados já existentes legíveis.

## Permissões
- Admin ativo poderá criar e editar produtos, variantes, fornecedores, contatos, endereços e ofertas.
- Vendedor ativo continuará com acesso somente de leitura ao catálogo e ao dashboard.
- Todas as escritas serão validadas no servidor e protegidas também pelas políticas do banco; nenhum segredo irá ao navegador.

## Telas e fluxos
- Adicionar páginas autenticadas de Produtos, Fornecedores e Ofertas à navegação.
- Fornecer listagem, estados vazio/carregando/erro e formulários mínimos em janelas modais para criar e editar registros.
- Manter tabelas no desktop e listas adaptadas no celular, no visual roxo/azul atual.
- Atualizar o dashboard para ler variantes e ofertas reais, sem exemplos artificiais.

## Detalhes técnicos
- Alteração de banco somente por migração aditiva, com GRANTs, RLS, índices, validações e gatilho de histórico.
- Funções protegidas com validação de entrada e checagem server-side de administrador para mutações.
- O histórico armazenará preço, estoque, disponibilidade e data/hora de cada inclusão ou alteração relevante de oferta.

## Validação
- Conferir tipos e compilação.
- Testar no preview os fluxos principais de Admin e a restrição de edição para Vendedor.
- Validar dashboard e páginas novas em desktop e celular, incluindo estados vazios e atualização após cadastro.
