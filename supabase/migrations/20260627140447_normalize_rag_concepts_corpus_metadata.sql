update public.rag_corpora
set
  source_name = 'RAG Lens',
  source_url = 'https://github.com/lagarcess/rag-lens',
  license = 'Original first-party demo text written for RAG Lens.'
where slug = 'rag-concepts-primer';
