import { useSearchParams } from 'react-router-dom';
import { MaterialCard } from './MaterialCard';
import { IdeaCard } from './IdeaCard';

export function EditorialCards() {
  const [params] = useSearchParams();
  const material = params.get('material'), slot = params.get('slot');
  if (material || slot) return <MaterialCard key={JSON.stringify([material, slot])} />;
  const idea = params.get('idea');
  if (idea || params.get('action') === 'idea') return <IdeaCard key={idea || 'new'} id={idea} />;
  return null;
}
