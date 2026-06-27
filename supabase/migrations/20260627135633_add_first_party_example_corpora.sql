insert into public.rag_corpora (
  slug,
  title,
  description,
  source_name,
  source_url,
  license,
  is_example
) values
  (
    'claim-check-clinic',
    'Claim Check Clinic',
    'Original evidence retrieval and claim-support demo written for RAG Lens.',
    'RAG Lens',
    'https://github.com/lagarcess/rag-lens',
    'Original first-party demo text written for RAG Lens; not derived from SciFact, BEIR, or any benchmark dataset.',
    true
  ),
  (
    'two-hop-systems-brief',
    'Two-Hop Systems Brief',
    'Original multi-hop retrieval debugging demo written for RAG Lens.',
    'RAG Lens',
    'https://github.com/lagarcess/rag-lens',
    'Original first-party demo text written for RAG Lens; not derived from HotpotQA or any benchmark dataset.',
    true
  )
on conflict (slug) do update set
  title = excluded.title,
  description = excluded.description,
  source_name = excluded.source_name,
  source_url = excluded.source_url,
  license = excluded.license,
  is_example = excluded.is_example;

delete from public.rag_corpora
where slug in ('scifact-mini', 'hotpotqa-mini')
  and not exists (
    select 1
    from public.rag_documents
    where rag_documents.corpus_slug = rag_corpora.slug
  );
