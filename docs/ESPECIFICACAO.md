# MEMÓRIA REFLEXIVA

## Especificação Oficial do Produto — Versão 0.1

**Status:** Planejamento e arquitetura
**Produto inicial:** Aplicação web privada
**Usuário principal:** Geovane
**Objetivo:** Produção assistida de reflexões autorais diárias
**Nome "Memória Reflexiva":** nome provisório do projeto

---

# 1. VISÃO DO PRODUTO

O Memória Reflexiva será um aplicativo privado criado para permitir que Geovane volte a produzir suas reflexões diárias com muito menos esforço operacional, sem perder sua participação intelectual, sua metodologia, seu estilo de escrita e sua identidade.

O sistema utilizará três fontes fundamentais:

1. **Memória histórica:** aproximadamente 365 reflexões produzidas anteriormente pelo próprio Geovane.
2. **Reflexão-fonte do dia:** material escrito que Geovane recebe diariamente.
3. **Comentário pessoal do Geovane:** interpretação, opinião ou contribuição pessoal fornecida por escrito ou por áudio.

Essas informações serão processadas por um sistema de inteligência artificial que produzirá um novo texto seguindo os padrões editoriais e de raciocínio encontrados no trabalho histórico de Geovane.

Geovane continuará sendo o responsável pela aprovação final.

Após a aprovação, o texto será transformado em áudio pelo ElevenLabs utilizando uma voz clonada/autorizada do próprio Geovane.

O áudio final será armazenado no sistema e disponibilizado para download.

Geovane poderá então distribuir esse arquivo pelo WhatsApp ou por outros meios.

---

# 2. PRINCÍPIO CENTRAL DO PRODUTO

O aplicativo não deverá simplesmente:

**"pedir para uma IA escrever como Geovane".**

Ele deverá construir e consultar uma verdadeira:

# MEMÓRIA AUTORAL DO GEOVANE

Essa memória será formada gradualmente por:

- reflexões originais;
- características de escrita;
- temas;
- estruturas narrativas;
- conceitos recorrentes;
- vocabulário;
- exemplos relacionados;
- comentários pessoais;
- textos gerados;
- correções realizadas;
- versões aprovadas.

O sistema deverá diferenciar claramente:

**o que Geovane escreveu originalmente;**

**o que outra pessoa escreveu;**

**o que a inteligência artificial produziu;**

**o que Geovane corrigiu;**

**e o que efetivamente foi aprovado e publicado.**

Nenhuma dessas fontes deverá ser confundida ou sobrescrita.

---

# 3. OBJETIVO PRINCIPAL

Reduzir drasticamente o esforço necessário para Geovane produzir uma reflexão diária, preservando sua participação intelectual e sua identidade editorial.

O aplicativo deve transformar um processo trabalhoso em um fluxo diário simples:

**Receber → Comentar → Gerar → Revisar → Aprovar → Narrar → Baixar**

---

# 4. USUÁRIO DO MVP

Inicialmente teremos apenas um usuário operacional principal:

## Geovane

Geovane poderá:

- entrar no aplicativo;
- consultar sua memória histórica;
- cadastrar a reflexão recebida naquele dia;
- escrever um comentário;
- gravar um comentário;
- solicitar uma nova reflexão;
- visualizar o texto gerado;
- solicitar outra versão;
- editar o texto;
- aprovar o texto;
- gerar o áudio;
- ouvir o áudio;
- baixar o áudio;
- consultar reflexões anteriores.

A arquitetura deverá permitir outros usuários futuramente, mas não criaremos uma estrutura de equipes complexa no MVP.

---

# 5. FLUXO PRINCIPAL DO DIA

## Passo 1 — Login

Geovane acessa o aplicativo de forma autenticada.

---

## Passo 2 — Painel

O sistema apresenta:

**Reflexão de hoje**

Status:

- não iniciada;
- em preparação;
- aguardando revisão;
- aprovada;
- áudio sendo produzido;
- concluída.

---

## Passo 3 — Reflexão recebida

Geovane cola no aplicativo o texto que recebeu naquele dia.

Campos principais:

**Título opcional**

**Data**

**Reflexão recebida**

**Fonte/autoria opcional**

---

## Passo 4 — Comentário do Geovane

Geovane escolhe:

### Escrever comentário

ou:

### Gravar comentário

Poderemos permitir ambos simultaneamente.

---

# 6. COMENTÁRIO EM ÁUDIO

Se Geovane escolher gravar:

1. aplicativo começa a gravação;
2. Geovane fala;
3. gravação é finalizada;
4. áudio original é armazenado;
5. serviço de transcrição converte áudio para texto;
6. transcrição aparece na tela;
7. Geovane pode revisar a transcrição;
8. transcrição passa a fazer parte da geração.

O áudio original nunca deverá ser substituído pela transcrição.

Teremos:

**Arquivo original**

-

**Transcrição**

---

# 7. BOTÃO "CRIAR MINHA REFLEXÃO"

Depois que reflexão-fonte e comentário estiverem disponíveis, Geovane poderá solicitar a geração.

O aplicativo inicia então o Motor Reflexivo.

---

# 8. MOTOR REFLEXIVO

O Motor Reflexivo será o coração intelectual do aplicativo.

Seu processamento será dividido em etapas.

## Etapa A — Compreensão da reflexão do dia

A IA identifica:

- assunto principal;
- subtemas;
- conceitos;
- passagens mencionadas;
- questões humanas;
- possíveis ensinamentos;
- elementos centrais da mensagem.

---

## Etapa B — Compreensão do comentário de Geovane

A IA identifica:

- opinião de Geovane;
- interpretação;
- sentimentos;
- exemplos;
- críticas;
- concordâncias;
- discordâncias;
- experiências mencionadas;
- mensagem que Geovane deseja transmitir.

A prioridade editorial deverá ser preservar essa contribuição.

---

## Etapa C — Consulta da memória

O sistema procura dentro da memória histórica reflexões relacionadas ao assunto.

Por exemplo:

Se a reflexão atual abordar:

**perdão**

o sistema poderá localizar trabalhos anteriores de Geovane envolvendo:

- perdão;
- mágoa;
- reconciliação;
- misericórdia;
- ressentimento;
- relações pessoais.

Não dependeremos somente de palavras idênticas.

Será utilizada busca por significado.

---

## Etapa D — Perfil Autoral

O sistema recupera também o:

# PERFIL AUTORAL DO GEOVANE

Esse perfil conterá instruções estruturadas sobre como Geovane costuma escrever.

---

## Etapa E — Composição

O modelo recebe:

**Reflexão do dia**

-

**Comentário de Geovane**

-

**Perfil Autoral**

-

**Reflexões históricas relevantes**

-

**Regras editoriais**

e cria o primeiro texto.

---

# 9. PERFIL AUTORAL DO GEOVANE

Criaremos um componente específico para registrar padrões identificados nas 365 reflexões.

Exemplos de características que poderemos mapear:

- tamanho médio;
- abertura;
- desenvolvimento;
- encerramento;
- tom de voz;
- formalidade;
- vocabulário;
- frases recorrentes;
- maneira de fazer perguntas;
- referências religiosas;
- analogias;
- exemplos;
- relação entre espiritualidade e cotidiano;
- estrutura de parágrafos;
- maneira de chamar o leitor à reflexão;
- expressões que costuma utilizar;
- expressões que evita.

Esse documento não será tratado como verdade imutável.

Ele poderá evoluir.

---

# 10. MEMÓRIA SEMÂNTICA

As 365 reflexões serão armazenadas individualmente.

Cada reflexão poderá possuir:

- título;
- texto original;
- data;
- temas;
- subtópicos;
- referências;
- resumo;
- características editoriais;
- embedding;
- metadados.

O embedding permitirá ao sistema descobrir textos semelhantes pelo significado.

Exemplo:

A reflexão atual fala sobre:

**"a dificuldade de reconstruir uma relação depois de uma decepção."**

Mesmo que nenhuma reflexão antiga use exatamente essa frase, a memória poderá encontrar textos anteriores relacionados a:

**confiança, perdão, ressentimento e reconciliação.**

---

# 11. GERAÇÃO DA REFLEXÃO

A geração resultará inicialmente em:

## Versão IA 1

Geovane poderá:

**Aprovar**

**Editar**

ou:

**Gerar outra versão**

Também poderemos permitir futuramente comandos como:

- deixar mais curta;
- aprofundar;
- tornar mais simples;
- aproximar mais do meu estilo;
- mudar a conclusão.

Mas esses controles deverão ser limitados no começo para não complicar a experiência.

---

# 12. REVISÃO

A tela de revisão deverá mostrar claramente:

## Reflexão criada

[texto]

E os comandos:

**Editar**

**Gerar novamente**

**Aprovar reflexão**

A IA nunca deverá considerar uma reflexão publicada antes da aprovação explícita de Geovane.

---

# 13. APRENDIZADO EDITORIAL

Esse será um dos maiores ativos do projeto.

Se a IA produzir:

### Versão IA

e Geovane transformar aquilo em:

### Versão corrigida

guardaremos as duas.

Assim poderemos identificar:

**Versão IA → alteração de Geovane → versão final**

Ao longo do tempo criaremos um conjunto de dados contendo exatamente as preferências editoriais reais dele.

Isso permitirá aperfeiçoar o sistema.

---

# 14. GERAÇÃO DE VOZ

Somente depois da aprovação textual:

**Texto aprovado**

↓

**ElevenLabs**

↓

**Voz autorizada de Geovane**

↓

**Arquivo de áudio**

↓

**Armazenamento**

↓

**Player**

↓

**Download**

A documentação atual do ElevenLabs oferece APIs de Text-to-Speech e mecanismos específicos de clonagem de voz; também diferencia clonagem instantânea de clonagem profissional. A escolha exata da modalidade será feita na fase de integração e testes de qualidade.

---

# 15. RESULTADO FINAL

Após a geração, a tela mostrará:

# Reflexão concluída

**Data**

**Título**

**Texto aprovado**

**Player de áudio**

▶ Reproduzir

**Baixar MP3**

Também poderemos incluir futuramente:

**Compartilhar**

Mas integração automática com WhatsApp não faz parte do primeiro MVP.

---

# 16. MAPA OFICIAL DE TELAS

## 01 — Login

Objetivo:

entrar no sistema.

---

## 02 — Início / Painel

Objetivo:

mostrar imediatamente se a reflexão do dia já foi produzida.

Elementos:

- saudação;
- data;
- reflexão de hoje;
- status;
- botão principal;
- últimas reflexões;
- calendário simplificado.

---

## 03 — Nova Reflexão

Etapa 1.

Elementos:

**Reflexão recebida**

campo grande para texto.

**Fonte**

opcional.

**Data**

automática, editável quando necessário.

Botão:

**Continuar**

---

## 04 — Meu Comentário

Elementos:

### Aba 1

Escrever

### Aba 2

Gravar

Gravação:

🎙️ **Começar gravação**

Depois:

▶ ouvir

🗑 refazer

Transcrição apresentada abaixo.

Botão:

**Criar minha reflexão**

---

## 05 — Processamento

Tela simples.

Mensagens poderão representar etapas reais:

**Analisando a reflexão...**

**Consultando a memória...**

**Preparando uma nova reflexão...**

Não devemos mostrar processos falsos apenas para entretenimento.

---

## 06 — Revisão

Mostra o texto completo.

Ações:

**Editar**

**Gerar nova versão**

**Aprovar**

---

## 07 — Geração do áudio

Após aprovação.

Mostra status de processamento.

---

## 08 — Reflexão Concluída

Texto + áudio.

Ações:

▶ Ouvir

⬇ Baixar MP3

---

## 09 — Histórico

Lista cronológica.

Exemplo:

04/09/2026 — Esperança

03/09/2026 — Perdão

02/09/2026 — Confiança

Filtros futuros:

- período;
- assunto;
- status.

---

## 10 — Detalhes da Reflexão

Mostra toda a história daquela publicação:

- fonte recebida;
- comentário;
- áudio do comentário;
- transcrição;
- texto criado pela IA;
- edições;
- texto aprovado;
- áudio publicado;
- reflexões históricas consultadas.

---

## 11 — Memória Reflexiva

Biblioteca das 365 reflexões.

Permite:

- visualizar;
- pesquisar;
- filtrar;
- abrir reflexão;
- verificar processamento.

---

## 12 — Perfil Autoral

Inicialmente poderá ser uma tela administrativa.

Mostra:

- características identificadas;
- regras;
- versão atual do perfil;
- data da última atualização.

---

## 13 — Configurações

Contém futuramente:

- conta;
- preferências;
- geração;
- voz;
- integrações.

Segredos e API keys não serão mostrados publicamente.

---

# 17. NAVEGAÇÃO PRINCIPAL

A navegação deve ser extremamente simples:

**Hoje**

**Histórico**

**Memória**

**Configurações**

O aplicativo deverá funcionar adequadamente tanto no computador quanto no celular.

---

# 18. MODELO INICIAL DO BANCO DE DADOS

O banco será PostgreSQL no Supabase.

As principais entidades serão:

## users

Usuários do aplicativo.

---

## author_profiles

Perfil autoral.

---

## historical_reflections

As 365 reflexões originais.

Campos conceituais:

- id;
- título;
- texto;
- data original;
- autor;
- temas;
- resumo;
- metadados;
- embedding;
- data de importação.

---

## daily_sources

Reflexões externas recebidas diariamente.

---

## geovane_comments

Comentários pessoais.

Tipo:

- texto;
- áudio;
- texto + áudio.

---

## comment_audio

Arquivo original.

---

## transcriptions

Transcrição produzida a partir do áudio.

---

## reflection_sessions

Representa todo o trabalho daquele dia.

Será a entidade que conecta:

fonte

-

comentário

-

gerações

-

aprovação

-

áudio.

---

## generated_reflections

Cada geração da IA.

Se forem produzidas três versões, guardaremos três registros.

---

## reflection_edits

Alterações feitas manualmente.

---

## approved_reflections

Versão editorial aprovada.

---

## generated_audio

Arquivo final criado pelo ElevenLabs.

---

## retrieval_references

Registra quais reflexões históricas foram recuperadas para auxiliar determinada geração.

Isso será muito importante para auditoria e evolução da IA.

---

## generation_logs

Registra tecnicamente o processamento.

---

# 19. RELACIONAMENTO DOS DADOS

Conceitualmente:

**Geovane**

↓

**Sessão diária**

↙︎ ↘︎

**Fonte diária** **Comentário**

↓ ↓

```
                  **Áudio**

                      ↓

                **Transcrição**

```

↘︎ ↙︎

**Motor Reflexivo**

↓

**Reflexões históricas consultadas**

↓

**Geração IA**

↓

**Edição**

↓

**Aprovação**

↓

**Áudio ElevenLabs**

---

# 20. TECNOLOGIA DA MEMÓRIA

O Supabase suporta atualmente PostgreSQL com a extensão pgvector para armazenamento e busca de embeddings, inclusive para arquiteturas RAG. Isso encaixa diretamente no nosso caso de uso da biblioteca das 365 reflexões.

Portanto, nossa recomendação permanece:

# Supabase + PostgreSQL + pgvector

Inicialmente não precisamos de um segundo banco exclusivo para vetores.

---

# 21. ARQUITETURA DO SISTEMA

## Front-end

**Next.js + React + TypeScript**

Responsável pela interface.

A documentação atual do Next.js mantém o App Router como arquitetura principal e permite aplicações com componentes de servidor e cliente, adequado ao nosso caso.

---

## Backend

Parte sensível executada no servidor.

Responsável por:

- conversar com modelo de IA;
- processar prompts;
- consultar memória;
- gerar embeddings;
- transcrever áudio;
- chamar ElevenLabs;
- armazenar resultados;
- controlar segredos.

---

## Banco de dados

**Supabase PostgreSQL**

---

## Autenticação

**Supabase Auth**

O Supabase integra autenticação ao PostgreSQL e permite combinar usuários autenticados com políticas RLS de autorização.

---

## Arquivos

**Supabase Storage**

Armazenará:

- gravações;
- arquivos temporários necessários;
- MP3 finais.

O Storage pode aplicar políticas de acesso integradas ao RLS.

---

## Código

**GitHub**

Armazenará:

- código;
- histórico de alterações;
- documentação;
- migrations;
- configuração do projeto.

Não armazenará reflexões privadas como banco de produção.

---

# 22. MODELO DE IA

Ainda não consolidaremos o fornecedor.

Avaliaremos:

- qualidade de escrita em português;
- capacidade de seguir estilo;
- janela de contexto;
- preço;
- confiabilidade;
- integração;
- privacidade;
- geração estruturada.

A arquitetura deverá evitar ficar excessivamente dependente de um único modelo.

---

# 23. TRANSCRIÇÃO

Também não consolidaremos o fornecedor nesta fase.

Precisamos avaliar especialmente:

- português brasileiro;
- qualidade do áudio de celular;
- pontuação;
- velocidade;
- custo;
- integração.

---

# 24. REGRAS DE NEGÓCIO

### RN-001

Uma reflexão histórica original nunca deverá ser alterada automaticamente.

### RN-002

Conteúdo recebido externamente deverá ser identificado como fonte externa.

### RN-003

Comentário de Geovane deverá ser preservado.

### RN-004

Uma geração de IA nunca substituirá outra geração.

### RN-005

Alterações de Geovane deverão ser preservadas.

### RN-006

Somente uma versão explicitamente aprovada poderá se tornar versão final.

### RN-007

Áudio publicado será produzido somente a partir de versão aprovada.

### RN-008

Arquivos de áudio deverão continuar disponíveis depois da geração.

### RN-009

Falhas do ElevenLabs não poderão apagar a reflexão escrita.

### RN-010

Falha na transcrição deverá permitir que Geovane escreva seu comentário manualmente.

### RN-011

Cada reflexão deve possuir histórico auditável.

### RN-012

Credenciais de serviços externos nunca deverão chegar ao navegador.

---

# 25. SEGURANÇA

A primeira versão já deverá possuir:

- autenticação;
- autorização;
- RLS;
- armazenamento privado;
- proteção das APIs;
- segredos somente no servidor;
- validação de uploads;
- limites apropriados;
- logs de erro;
- backups;
- separação entre ambiente de desenvolvimento e produção.

A voz clonada do Geovane deverá ser considerada material sensível.

O acesso ao identificador/configuração da voz e às credenciais do serviço será estritamente controlado.

---

# 26. O MVP OFICIAL

O MVP será considerado funcional quando Geovane conseguir:

1. fazer login;
2. cadastrar a reflexão recebida;
3. escrever seu comentário;
4. ou gravar seu comentário;
5. obter a transcrição;
6. solicitar a geração;
7. utilizar a memória histórica;
8. receber uma reflexão;
9. editar;
10. gerar novamente;
11. aprovar;
12. gerar áudio com sua voz autorizada;
13. ouvir;
14. baixar MP3;
15. consultar posteriormente aquela reflexão.

Isso constitui o:

# MVP 1.0

---

# 27. O QUE NÃO ENTRA NO MVP

Ficam inicialmente fora:

- aplicativo nativo Android;
- aplicativo nativo iOS;
- publicação automática em redes sociais;
- envio automático para WhatsApp;
- WhatsApp Business API;
- múltiplos criadores;
- pagamento;
- assinaturas;
- aplicativo público;
- marketplace;
- rede social;
- automações editoriais complexas;
- publicação completamente automática.

---

# 28. CRITÉRIOS DE QUALIDADE DA IA

Não avaliaremos apenas:

**"o texto ficou bonito?"**

Avaliaremos:

### Fidelidade ao comentário

O texto representa aquilo que Geovane quis transmitir?

### Fidelidade ao estilo

Parece compatível com sua forma de escrever?

### Uso correto da fonte

Representou adequadamente a reflexão recebida?

### Originalidade

Não simplesmente copiou trechos antigos?

### Coerência

O texto possui começo, desenvolvimento e conclusão?

### Segurança editorial

Inventou alguma declaração problemática?

### Necessidade de edição

Quanto Geovane precisou modificar?

Esta última medida será particularmente importante.

---

# 29. MÉTRICA PRINCIPAL DO PRODUTO

Nossa principal métrica inicial não será número de usuários.

Será:

# TAXA DE ACEITAÇÃO EDITORIAL

Pergunta:

**Quanto do texto produzido pela IA Geovane consegue aproveitar?**

Se ele precisar reescrever 80%, o sistema ainda não resolveu seu problema.

Se precisar alterar somente 5–15%, temos um sistema de grande utilidade.

Também mediremos:

- tempo para produzir a reflexão;
- quantidade de versões necessárias;
- percentual alterado;
- erros de transcrição;
- falhas de geração de áudio.

---

# 30. PROCESSO DE VALIDAÇÃO

Antes de colocar as 365 reflexões no sistema definitivo:

## Experimento 1

Selecionar aproximadamente 10–20 reflexões representativas.

## Experimento 2

Processar e catalogar esses textos.

## Experimento 3

Criar Perfil Autoral inicial.

## Experimento 4

Construir busca semântica.

## Experimento 5

Produzir reflexões experimentais.

## Experimento 6

Geovane avalia.

## Experimento 7

Ajustamos o Motor Reflexivo.

Somente depois expandimos para toda a biblioteca.

---

# 31. FASES DO PROJETO

## FASE 1 — Produto

**STATUS: CONCLUÍDA**

Visão e problema definidos.

---

## FASE 2 — Especificação

**STATUS: EM ANDAMENTO**

Este documento inaugura oficialmente essa fase.

---

## FASE 3 — UX/UI

Próxima etapa.

Precisaremos desenhar:

- estrutura visual;
- wireframes;
- telas;
- componentes;
- fluxo.

---

## FASE 4 — Dados

Produziremos o modelo físico do banco.

---

## FASE 5 — IA

Projetaremos oficialmente:

- ingestão;
- embeddings;
- retrieval;
- prompt;
- validação;
- aprendizado editorial.

---

## FASE 6 — Fundação Técnica

Criação:

- GitHub;
- projeto;
- Next.js;
- Supabase;
- ambientes.

---

## FASE 7 — Desenvolvimento

Implementação progressiva.

---

## FASE 8 — Integrações

IA.

Transcrição.

ElevenLabs.

---

## FASE 9 — Testes

Funcionais.

IA.

Segurança.

Interface.

---

## FASE 10 — Homologação Geovane

Uso real controlado.

---

## FASE 11 — Produção

Publicação oficial.

---

# 32. QUADRO ATUAL DO PROJETO

_Nota de manutenção: o quadro abaixo é o retrato original do documento (Fase 2).
O estado real de implementação evoluiu desde então — ver `AGENTS.md` na raiz do
repositório para o status técnico atual (schema, RLS, Edge Functions, memória
importada)._

## PRODUTO

🟢 Definido

## MVP

🟢 Definido

## FLUXO PRINCIPAL

🟢 Definido

## TELAS

🟢 Estrutura funcional definida

## ARQUITETURA

🟡 Definição inicial aprovada

## BANCO DE DADOS

🟡 Modelo conceitual definido

## MEMÓRIA IA

🟡 Estratégia definida

## PERFIL AUTORAL

🟡 Conceito definido

## MODELO DE IA

⚪ A selecionar

## TRANSCRIÇÃO

⚪ A selecionar

## ELEVENLABS

🟡 Integração definida conceitualmente

## GITHUB

🟡 Plataforma definida

## SUPABASE

🟡 Plataforma definida

## UX/UI

⚪ Próxima etapa

## CÓDIGO

⚪ Ainda não iniciado

## TESTES

⚪ Ainda não iniciados

## DEPLOY

⚪ Ainda não iniciado

---

# 33. DEFINIÇÃO DO PRODUTO EM UMA FRASE

> **Memória Reflexiva é uma plataforma privada de inteligência editorial que utiliza a memória histórica, o estilo autoral e a contribuição diária de Geovane para ajudá-lo a criar, revisar, narrar e distribuir novas reflexões.**

---

# 34. PRINCÍPIO QUE GUIARÁ TODA A CONSTRUÇÃO

## A IA não substitui Geovane.

Ela:

**recupera sua memória,**

**organiza suas referências,**

**compreende sua contribuição,**

**produz um primeiro trabalho,**

**aprende com suas correções**

**e reduz o esforço necessário para transformar pensamento em conteúdo.**

A palavra final continua sendo dele.
