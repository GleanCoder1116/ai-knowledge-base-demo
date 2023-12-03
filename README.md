# 领域特定的ChatGPT起始应用程序

ChatGPT非常适合进行日常的通用问答，但在需要领域特定知识时存在一些不足。此外，它会编造答案来填补其知识空白，并且从不引用其信息来源，因此无法真正被信任。这个起始应用程序使用嵌入向量和向量搜索来解决这个问题，更具体地说，展示了如何利用OpenAI的聊天完成API来创建面向领域特定知识的对话界面。

嵌入向量是由浮点数向量表示的，用于衡量文本字符串的"相关性"。它们非常有用于搜索结果排序、聚类、分类等。相关性通过余弦相似度来衡量。如果两个向量的余弦相似度接近1，说明它们非常相似且指向相同的方向。在文本嵌入中，两个嵌入向量之间的高余弦相似度表明相应的文本字符串高度相关。

这个起始应用程序使用嵌入向量生成文档的向量表示，然后利用向量搜索找到与查询最相似的文档。向量搜索的结果被用来构建提示。然后将响应流式传输给用户。请查阅Supabase博客上关于[pgvector和OpenAI嵌入](https://supabase.com/blog/openai-embeddings-postgres-vector)的更多背景知识。

使用的技术:

- Next.js (React框架) + Vercel托管
- Supabase (使用他们的pgvector实现作为向量数据库)
- OpenAI API (用于生成嵌入和聊天完成)
- TailwindCSS (用于样式)

## 功能概述

创建和存储嵌入:

- 网页被爬取，转换为纯文本并分割成1000个字符的文档
- 使用OpenAI的嵌入API，利用"text-embedding-ada-002"模型为每个文档生成嵌入
- 将嵌入向量存储在Supabase的postgres表中，使用pgvector; 表包含三列: 文档文本、源URL以及从OpenAI API返回的嵌入向量。

响应查询:

- 从用户提示生成单个嵌入向量
- 使用该嵌入向量对向量数据库进行相似性搜索
- 使用相似性搜索的结果构建GPT-3.5/GPT-4的提示
- 然后将GPT的响应流式传输给用户。

## 入门指南

以下设置指南假定您至少对使用React和Next.js开发Web应用程序有基本的了解。熟悉OpenAI API和Supabase会对使事情正常运行有所帮助，但不是必需的。

### 设置Supabase

- 在https://app.supabase.com/sign-in上创建Supabase帐户和项目。注意：Supabase对pgvector的支持相对较新（02/2023），所以如果您的项目是在那之前创建的，重要的是创建一个新项目。
- 首先，我们将启用Vector扩展。在Supabase中，可以通过Web门户的“Database”→“Extensions”来完成此操作。您也可以在SQL中运行以下命令完成此操作：

```sql
create extension vector;
```

- 接下来，让我们创建一个表来存储我们的文档及其嵌入。转到SQL编辑器并运行以下查询：

```sql
create table documents (
  id bigserial primary key,
  content text,
  url text,
  embedding vector (1536)
);
```

- 最后，我们将创建一个用于执行相似性搜索的函数。转到SQL编辑器并运行以下查询：

```sql
create or replace function match_documents (
  query_embedding vector(1536),
  similarity_threshold float,
  match_count int,
  project_id uuid,
  user_id uuid
)
returns table (
  id bigint,
  content text,
  url text,
  similarity float,
  project_id uuid,
  user_id uuid
)
language plpgsql
as $$
begin
  return query
  select
    documents.id,
    documents.content,
    documents.url,
    1 - (documents.embedding <=> query_embedding) as similarity
  from documents
  where 1 - (documents.embedding <=> query_embedding) > similarity_threshold
  and documents.project_id = project_id
  and documents.user_id = user_id
  order by documents.embedding <=> query_embedding
  limit match_count;
end;
$$;
```
### 设置本地环境

- 安装依赖项
```bash
npm install
```

- 在根目录中创建一个名为`.env.local`的文件以存储环境变量：

```bash
cp .env.local.example .env.local
```

- 打开`.env.local`文件，添加您的Supabase项目URL和API密钥。您可以在Supabase Web门户的`Project`→`API`下找到它们。API密钥应存储在`SUPABASE_ANON_KEY`变量中，项目URL应存储在`NEXT_PUBLIC_SUPABASE_URL`下。
- 将您的OpenAI API密钥添加到`.env.local`文件。您可以在OpenAI Web门户的`API Keys`下找到它。API密钥应存储在`OPENAI_API_KEY`变量中。
- [可选]提供`OPEAI_PROXY`环境变量以启用您自定义的OpenAI API代理。将其设置为 `""` 以直接调用官方API。
- [可选]提供`SPLASH_URL`环境变量以启用您的[splash](https://splash.readthedocs.io/en/stable/index.html)（Splash是一个JavaScript渲染服务，它是一个轻量级的带有HTTP API的Web浏览器，使用Python 3中的Twisted和QT5实现）API。将其设置为 `""` 以直接获取URL。
- 启动应用程序

```bash
npm run dev
```

- 在浏览器中打开http://localhost:3000查看应用程序。

## docker 部署

```sh
# 打包
docker build -t brick-doc-ai ./

# 打tag
docker tag brick-doc-ai:latest image-beta.weiyun.baidu.com/baidu_projects/axure-sketch-hub/brick-doc-ai:[tagid]

# 发布到微云
docker push image-beta.weiyun.baidu.com/baidu_projects/axure-sketch-hub/brick-doc-ai:[tagid]
```