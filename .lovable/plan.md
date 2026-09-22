# Dashboard inicial de monitoramento

## Objetivo
Transformar a visão geral autenticada em um dashboard real, mantendo login, papéis e administração de usuários intactos.

## O que será construído
- Navegação lateral e barra superior responsivas, no visual roxo/azul já aprovado.
- Quatro indicadores: melhor preço atual, ofertas disponíveis, fornecedores ativos e última atualização.
- Destaque das ofertas mais recentes.
- Comparação em tabela no desktop e lista adaptada no celular, com modelo, capacidade, cor, condição, preço, estoque, fornecedor e data/hora.
- Estados de carregamento, erro e ausência de dados, sem números fictícios.
- Área reservada para gráficos futuros, claramente identificada como indisponível até existir histórico.

## Dados e acesso
- Criar somente a estrutura mínima de catálogo necessária: fornecedores, produtos e ofertas.
- Não criar telas de cadastro desses dados nesta etapa.
- Admin e Vendedor ativos terão apenas leitura no dashboard, usando as mesmas regras de autenticação existentes.
- Escritas continuarão bloqueadas para usuários comuns; não haverá segredo no navegador.
- Sem registros, o dashboard apresentará orientação e valores neutros, sem semear exemplos.

## Detalhes técnicos
- Leitura por função protegida no servidor, respeitando as regras do banco.
- Migração com permissões explícitas, proteção por linha e índices de consulta.
- Componentes pequenos para indicadores, ofertas recentes, comparação e estados vazios.
- Metadados próprios da página mantidos em português-BR.

## Validação
- Verificar tipos e compilação.
- Abrir o dashboard autenticado em desktop e celular.
- Confirmar estado vazio, responsividade, navegação e ausência de erros no navegador.
