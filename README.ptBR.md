# Sistema de PDV e Gerenciamento de Inventário

Este é um Sistema de Ponto de Venda (PDV) e Gerenciamento de Inventário construído com Next.js, React e Supabase. Ele oferece uma solução abrangente para gerenciar produtos, clientes, pedidos e transações em um ambiente de varejo ou pequenos negócios.

Como desenvolvedor com ampla experiência na criação de aplicativos semelhantes, este projeto representa a culminação de anos de expertise na construção de sistemas PDV. É claro que, no início, o projeto pode parecer um pouco bruto, mas com o tempo e, espero, com a ajuda da comunidade, ele se tornará uma solução robusta e rica em recursos para empresas de todos os tamanhos.

Esta iteração específica abraça o espírito do desenvolvimento de código aberto, tornando-se livremente disponível para a comunidade usar, modificar e melhorar.

## Funcionalidades

- **Dashboard**: Visão geral de métricas e gráficos principais
- **Gerenciamento de Produtos**: Adicionar, editar, excluir e visualizar produtos
- **Gerenciamento de Clientes**: Gerenciar informações e status dos clientes
- **Gerenciamento de Pedidos**: Criar e gerenciar pedidos
- **Ponto de Venda (PDV)**: Processamento de vendas rápido e fácil
- **Autenticação de Usuários**: Sistema de login seguro

## Tecnologias Utilizadas

- **Frontend**: Next.js, React, Tailwind CSS
- **Backend**: Supabase (banco de dados PostgreSQL)
- **Gerenciamento de Estado**: React Hooks
- **Componentes de UI**: Componentes personalizados e Shadcn UI
- **Gráficos**: Recharts

## Primeiros Passos

1. Clone o repositório
2. Instale as dependências:
   ```
   npm install
   ```
3. Configure seu projeto Supabase e adicione as variáveis de ambiente necessárias:
   - Crie um arquivo `.env.local` na raiz do seu projeto
   - Adicione as seguintes linhas ao arquivo:
     ```
     NEXT_PUBLIC_SUPABASE_URL=seu_url_do_projeto_supabase
     NEXT_PUBLIC_SUPABASE_ANON_KEY=sua_chave_anon_do_supabase
     ```
   - Substitua `seu_url_do_projeto_supabase` e `sua_chave_anon_do_supabase` pelo URL do seu projeto Supabase e chave anônima reais
4. Execute o servidor de desenvolvimento:
   ```
   npm run dev
   ```
5. Abra [http://localhost:3000](http://localhost:3000) no seu navegador

## Estrutura do Projeto

- `src/app/`: Páginas do roteador Next.js
- `src/components/`: Componentes reutilizáveis do React
- `src/lib/`: Funções utilitárias e cliente Supabase
- `schema.sql`: Esquema do banco de dados

## Principais Páginas

- `/admin`: Dashboard principal
- `/admin/products`: Gerenciamento de produtos
- `/admin/customers`: Gerenciamento de clientes
- `/admin/orders`: Gerenciamento de pedidos
- `/admin/pos`: Interface do Ponto de Venda

## Esquema do Banco de Dados

O projeto utiliza um banco de dados PostgreSQL com as seguintes tabelas principais:

- `products`: Armazena informações dos produtos
- `customers`: Detalhes dos clientes
- `orders`: Informações dos pedidos
- `order_items`: Itens dentro de cada pedido
- `transactions`: Transações financeiras
- `payment_methods`: Métodos de pagamento disponíveis

Para o esquema completo, consulte `schema.sql`.

## Autenticação

A autenticação de usuários é realizada através do Supabase. A página de login está disponível em `/login`.

## Tratamento de Erros

Uma página básica de erro é implementada em `/error` para lidar e exibir quaisquer erros que ocorram durante a execução.

## Contribuindo

Contribuições são bem-vindas! Sinta-se à vontade para enviar um Pull Request.

## Licença

Este projeto é de código aberto e está disponível sob a [Licença MIT](LICENSE).