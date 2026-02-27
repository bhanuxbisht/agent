"""RAG (Retrieval-Augmented Generation) service using ChromaDB for persistent knowledge."""

from __future__ import annotations

import hashlib
import logging
from pathlib import Path
from typing import Any, Dict, List

logger = logging.getLogger(__name__)

_rag_available = True
try:
    import chromadb
except ImportError:
    _rag_available = False
    logger.warning("chromadb not installed — RAG features disabled")


class RAGService:
    """Persistent vector knowledge base that enriches research over time."""

    _instance: "RAGService | None" = None

    @classmethod
    def get_instance(cls, persist_dir: str = "./data/knowledge_base") -> "RAGService":
        if cls._instance is None:
            cls._instance = cls(persist_dir)
        return cls._instance

    def __init__(self, persist_dir: str = "./data/knowledge_base"):
        self.enabled = _rag_available
        if not self.enabled:
            logger.warning("RAGService running in no-op mode (chromadb missing)")
            return
        Path(persist_dir).mkdir(parents=True, exist_ok=True)
        self.client = chromadb.PersistentClient(path=persist_dir)
        self.collection = self.client.get_or_create_collection(
            name="research_knowledge",
            metadata={"hnsw:space": "cosine"},
        )
        logger.info(
            "RAG knowledge base ready — %d documents stored", self.collection.count()
        )

    @staticmethod
    def _doc_id(text: str) -> str:
        return hashlib.md5(text.encode("utf-8")).hexdigest()

    def index_research(self, topic: str, research_data: List[Dict[str, Any]]) -> int:
        """Upsert research results into the knowledge base. Returns doc count."""
        if not self.enabled:
            return 0

        documents, metadatas, ids = [], [], []

        for i, block in enumerate(research_data):
            sub_q = block.get("sub_question", "")
            summary = block.get("summary", "")
            if summary:
                doc = f"Topic: {topic}\nQuestion: {sub_q}\nAnswer: {summary}"
                documents.append(doc)
                metadatas.append({"topic": topic, "type": "summary", "sub_question": sub_q})
                ids.append(self._doc_id(doc))

            for source in block.get("sources", []):
                snippet = source.get("snippet", "")
                if snippet:
                    doc = (
                        f"Source: {source.get('title', '')}\n"
                        f"URL: {source.get('url', '')}\n"
                        f"Content: {snippet}"
                    )
                    documents.append(doc)
                    metadatas.append({
                        "topic": topic,
                        "type": "source",
                        "url": source.get("url", ""),
                        "title": source.get("title", ""),
                    })
                    ids.append(self._doc_id(doc))

        if documents:
            self.collection.upsert(documents=documents, metadatas=metadatas, ids=ids)
            logger.info("RAG indexed %d chunks for '%s'", len(documents), topic[:60])
        return len(documents)

    def retrieve(self, query: str, n_results: int = 10) -> List[Dict[str, Any]]:
        """Semantic search against the knowledge base."""
        if not self.enabled:
            return []
        count = self.collection.count()
        if count == 0:
            return []

        results = self.collection.query(
            query_texts=[query],
            n_results=min(n_results, count),
        )

        retrieved: List[Dict[str, Any]] = []
        for doc, meta, dist in zip(
            results.get("documents", [[]])[0],
            results.get("metadatas", [[]])[0],
            results.get("distances", [[]])[0],
        ):
            retrieved.append({
                "text": doc,
                "metadata": meta,
                "relevance": round(1.0 - dist, 3),
            })

        return [r for r in retrieved if r["relevance"] > 0.25]

    @property
    def document_count(self) -> int:
        if not self.enabled:
            return 0
        return self.collection.count()
