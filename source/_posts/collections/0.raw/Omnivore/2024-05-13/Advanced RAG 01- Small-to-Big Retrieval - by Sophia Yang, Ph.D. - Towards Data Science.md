---
title: "Advanced RAG 01: Small-to-Big Retrieval | by Sophia Yang, Ph.D. | Towards Data Science"
date: "2026-04-11 21:40:28"
updated: "2026-04-11 21:40:28"
layout: post
permalink: /collections/0.raw/Omnivore/2024-05-13/Advanced-RAG-01-Small-to-Big-Retrieval-by-Sophia-Yang,-Ph.D.-Towards-Data-Science/
disableNunjucks: true
wiki: false
nav_hidden: true
categories:
  - 文档
---


# Advanced RAG 01: Small-to-Big Retrieval | by Sophia Yang, Ph.D. | Towards Data Science
#Omnivore

[Read on Omnivore](https://omnivore.app/me/advanced-rag-01-small-to-big-retrieval-by-sophia-yang-ph-d-towar-18f7004c29c)
[Read Original](https://towardsdatascience.com/advanced-rag-01-small-to-big-retrieval-172181b396d4)



## Child-Parent RecursiveRetriever and Sentence Window Retrieval with LlamaIndex

RAG (Retrieval-Augmented Generation) systems retrieve relevant information from a given knowledge base, thereby allowing it to generate factual, contextually relevant, and domain-specific information. However, RAG faces a lot of challenges when it comes to effectively retrieving relevant information and generating high-quality responses. In this series of blog posts/videos, I will walk through advanced RAG techniques aiming at optimizing the RAG workflow and addressing the challenges in naive RAG systems.

The first technique is called <strong>small-to-big retrieval</strong>. In basic RAG pipelines, we embed a big text chunk for retrieval, and this exact same text chunk is used for synthesis. But sometimes embedding/retrieving big text chunks can feel suboptimal. There might be a lot of filler text in a big text chunk that hides the semantic representation, leading to worse retrieval. What if we could embed/retrieve based on smaller, more targeted chunks, but still have enough context for the LLM to synthesize a response? Specifically, decoupling text chunks used for retrieval vs. the text chunks used for synthesis could be advantageous. Using smaller text chunks enhances the accuracy of retrieval, while larger text chunks offer more contextual information. The concept behind small-to-big retrieval is to use smaller text chunks during the retrieval process and subsequently provide the larger text chunk to which the retrieved text belongs to the large language model.

There are two primary techniques:

1. <strong>Smaller Child Chunks Referring to Bigger Parent Chunks</strong>: Fetch smaller chunks during retrieval first, then reference the parent IDs, and return the bigger chunks.
2. <strong>Sentence Window Retrieval:</strong> Fetch a single sentence during retrieval and return a window of text around the sentence.

In this blog post, we will dive into the implementations of these two methods in LlamaIndex. Why am I not doing it in LangChain? Because there are already lots of resources out there on advanced RAG with LangChain. I’d rather not duplicate the effort. Also, I use both LangChain and LlamaIndex. It’s best to understand more tools and use them flexibly.

You can find all the code in this [notebook](https://colab.research.google.com/github/sophiamyang/demos/blob/main/advanced%5Frag%5Fsmall%5Fto%5Fbig.ipynb).

## Basic RAG Review

Let’s start with a basic RAG implementation with 4 simple steps:

<strong>Step 1\. Loading Documents</strong>

We use a PDFReader to load a PDF file, and combine each page of the document into one Document object.

loader = PDFReader()  
docs0 = loader.load_data(file=Path("llama2.pdf"))  
doc_text = "\n\n".join([d.get_content() for d in docs0])  
docs = [Document(text=doc_text)]

<strong>Step 2\. Parsing Documents into Text Chunks (Nodes)</strong>

Then we split the document into text chunks, which are called “Nodes” in LlamaIndex, where we define the chuck size as 1024\. The default node IDs are random text strings, we can then format our node ID to follow a certain format.

node_parser = SimpleNodeParser.from_defaults(chunk_size=1024)  
base_nodes = node_parser.get_nodes_from_documents(docs)  
for idx, node in enumerate(base_nodes):  
node.id_ = f"node-{idx}"

<strong>Step 3\. Select Embedding Model and LLM</strong>

We need to define two models:

* The embedding model is used to create vector embeddings for each of the text chunks. Here we are calling the [FlagEmbedding](https://huggingface.co/BAAI/bge-small-en) model from Hugging Face.
* LLM: user query and the relevant text chunks are fed into the LLM so that it can generate answers with relevant context.

We can bundle these two models together in the ServiceContext and use them later in the indexing and querying steps.

embed_model = resolve_embed_model(“local:BAAI/bge-small-en”)  
llm = OpenAI(model="gpt-3.5-turbo")  
service_context = ServiceContext.from_defaults(llm=llm, embed_model=embed_model)

<strong>Step 4\. Create Index, retriever, and query engine</strong>

Index, retriever, and query engine are three basic components for asking questions about your data or documents:

* Index is a data structure that allows us to retrieve relevant information quickly for a user query from external documents. The Vector Store Index takes the text chunks/Nodes and then creates vector embeddings of the text of every node, ready to be queried by an LLM.

base_index = VectorStoreIndex(base_nodes, service_context=service_context)

* Retriever is used for fetching and retrieving relevant information given user query.

base_retriever = base_index.as_retriever(similarity_top_k=2)

* Query engine is built on top of the index and retriever providing a generic interface to ask questions about your data.

query_engine_base = RetrieverQueryEngine.from_args(  
    base_retriever, service_context=service_context  
)  
response = query_engine_base.query(  
    "Can you tell me about the key concepts for safety finetuning"  
)  
print(str(response))

![](https://proxy-prod.omnivore-image-cache.app/700x74,soUX4jvihcyINzicfT-8Zo5k01dR32kK9k8eKEEWtPkM/https://miro.medium.com/v2/resize:fit:875/0*WhEGQ39oX-MEGh_T)

## Advanced Method 1: Smaller Child Chunks Referring to Bigger Parent Chunks

In the previous section, we used a fixed chunk size of 1024 for both retrieval and synthesis. In this section, we are going to explore how to use smaller child chunks for retrieval and refer to bigger parent chunks for synthesis. The first step is to create smaller child chunks:

<strong>Step 1: Create Smaller Child Chunks</strong>

For each of the text chunks with chunk size 1024, we create even smaller text chunks:

* 8 text chunks of size 128
* 4 text chunks of size 256
* 2 text chunks of size 512

We append the original text chunk of size 1024 to the list of text chunks.

sub_chunk_sizes = [128, 256, 512]  
sub_node_parsers = [  
    SimpleNodeParser.from_defaults(chunk_size=c) for c in sub_chunk_sizes  
]

all_nodes = []  
for base_node in base_nodes:  
    for n in sub_node_parsers:  
        sub_nodes = n.get_nodes_from_documents([base_node])  
        sub_inodes = [  
            IndexNode.from_text_node(sn, base_node.node_id) for sn in sub_nodes  
        ]  
        all_nodes.extend(sub_inodes)

      
    original_node = IndexNode.from_text_node(base_node, base_node.node_id)  
    all_nodes.append(original_node)  
all_nodes_dict = {n.node_id: n for n in all_nodes}

When we take a look at all the text chunks \`all\_nodes\_dict\`, we can see many smaller chunks are associated with each of the original text chunks for example \`node-0\`. In fact, all of the smaller chunks reference to the large chunk in the metadata with index\_id pointing to the index ID of the larger chunk.

![](https://proxy-prod.omnivore-image-cache.app/700x316,stvbRaExGBJv2CNXOH_fiWEl1FBebHFSOwvP7qj-g1w8/https://miro.medium.com/v2/resize:fit:875/0*lM9jaUT8iNWMthjn)

<strong>Step 2: Create Index, retriever, and query engine</strong>

* Index: Create vector embeddings of all the text chunks.

vector_index_chunk = VectorStoreIndex(  
    all_nodes, service_context=service_context  
)

* Retriever: the key here is to use a <strong>RecursiveRetriever</strong> to traverse node relationships and fetch nodes based on “references”. This retriever will recursively explore links from nodes to other retrievers/query engines. For any retrieved nodes, if any of the nodes are IndexNodes, then it will explore the linked retriever/query engine and query that.

vector_retriever_chunk = vector_index_chunk.as_retriever(similarity_top_k=2)  
retriever_chunk = RecursiveRetriever(  
    "vector",  
    retriever_dict={"vector": vector_retriever_chunk},  
    node_dict=all_nodes_dict,  
    verbose=True,  
)

When we ask a question and retrieve the most relevant text chunks, it will actually retrieve the text chunk with the node id pointing to the parent chunk and thus retrieve the parent chunk.

![](https://proxy-prod.omnivore-image-cache.app/700x450,sYT7vQXP2Bc-uO-jUJcKovrAD-tjAy59d2-jlyGmtTzk/https://miro.medium.com/v2/resize:fit:875/0*8Cc9P8HsvgyQEW1l)

* Now with the same steps as before, we can create a query engine as a generic interface to ask questions about our data.

query_engine_chunk = RetrieverQueryEngine.from_args(  
    retriever_chunk, service_context=service_context  
)  
response = query_engine_chunk.query(  
    "Can you tell me about the key concepts for safety finetuning"  
)  
print(str(response))

![](https://proxy-prod.omnivore-image-cache.app/700x199,sJ9GhArk0T5afC_qydgr4CmOq0Zlz5DM5Sz3vJML6jgU/https://miro.medium.com/v2/resize:fit:875/0*2VfiBXe3_0_oh9zt)

## Advanced Method 2: Sentence Window Retrieval

To achieve an even more fine-grained retrieval, instead of using smaller child chunks, we can parse the documents into a single sentence per chunk.

In this case, single sentences will be similar to the “child” chunk concept we mentioned in method 1\. The sentence “window” (5 sentences on either side of the original sentence) will be similar to the “parent” chunk concept. In other words, we use the single sentences during retrieval and pass the retrieved sentence with the sentence window to the LLM.

<strong>Step 1: Create sentence window node parser</strong>

  
node_parser = SentenceWindowNodeParser.from_defaults(  
    window_size=3,  
    window_metadata_key="window",  
    original_text_metadata_key="original_text",  
)  
sentence_nodes = node_parser.get_nodes_from_documents(docs)  
sentence_index = VectorStoreIndex(sentence_nodes, service_context=service_context)

<strong>Step 2: Create query engine</strong>

When we create the query engine, we can replace the sentence with the sentence window using the MetadataReplacementPostProcessor, so that the window of the sentences get sent to the LLM.

query_engine = sentence_index.as_query_engine(  
    similarity_top_k=2,  
      
    node_postprocessors=[  
        MetadataReplacementPostProcessor(target_metadata_key="window")  
    ],  
)  
window_response = query_engine.query(  
    "Can you tell me about the key concepts for safety finetuning"  
)  
print(window_response)

The Sentence Window Retrieval was able to answer the question “Can you tell me about the key concepts for safety finetuning”:

![](https://proxy-prod.omnivore-image-cache.app/700x79,siqesV9g4qumzCVWDFqb2a4FyyiOvcQV8OCYBESNhGGM/https://miro.medium.com/v2/resize:fit:875/0*UP8zq7Cvlp9-R63g)

Here you can see the actual sentence retrieved and the window of the sentence, which provides more context and details.

![](https://proxy-prod.omnivore-image-cache.app/700x288,sWlvBquxrjKjsmxOhTJy8JSwxVJOM3CTnv8trLY-3Q_M/https://miro.medium.com/v2/resize:fit:875/0*SNakisDYccy2EaXu)

## <strong>Conclusion</strong>

In this blog, we explored how to use small-to-big retrieval to improve RAG, focusing on the Child-Parent RecursiveRetriever and Sentence Window Retrieval with LlamaIndex. In future blog posts, we will dive deeper into other tricks and tips. Stay tuned for more on this exciting journey into advanced RAG techniques!

## References:

* <https://docs.llamaindex.ai/en/latest/examples/node%5Fpostprocessor/MetadataReplacementDemo.html>
* <https://docs.llamaindex.ai/en/stable/examples/retrievers/recursive%5Fretriever%5Fnodes.html>

![](https://proxy-prod.omnivore-image-cache.app/700x394,s0x7NqfPmJX-gZAfYPC6lz1iN04WXZys2RLHRdGMwFIA/https://miro.medium.com/v2/resize:fit:875/1*urHmJosMAaUSF_VXGMShFA.png)

. . .

By [Sophia Yang](https://www.linkedin.com/in/sophiamyang/) on November 4, 2023

Connect with me on [LinkedIn](https://www.linkedin.com/in/sophiamyang/), [Twitter](https://twitter.com/sophiamyang), and [YouTube](https://www.youtube.com/SophiaYangDS) and join the DS/ML [Book Club](https://dsbookclub.github.io/) ❤️

