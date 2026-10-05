import {render,screen,cleanup} from '@testing-library/react';
import {MemoryRouter} from 'react-router-dom';
import {afterEach,describe,it,expect,vi} from 'vitest';
import {MaterialCard} from '../components/content/MaterialCard';
import {draftKey} from '../lib/editorialDrafts';
const fixtures=vi.hoisted(()=>({current:{id:10,title:'Material',body:'Server text',platformId:'reels',publishDate:'',createdDate:'2026-10-05',status:'in_progress',revision:1},command:vi.fn()}));
vi.mock('@/lib/authContext',()=>({useAuth:()=>({user:{id:'test-user'}})}));
vi.mock('@/lib/editorialContext',()=>({useEditorial:()=>({data:{main:{topics:[{id:1,title:'Idea',contentItems:[fixtures.current]}],products:[],funnels:[],editorial:{slots:[],weeks:{}}},publications:{schema:1,items:[]}},command:fixtures.command,busy:false,refresh:vi.fn()})}));
afterEach(()=>{cleanup();localStorage.clear();fixtures.current.body='Server text';fixtures.current.revision=1;});
describe('material draft recovery',()=>{
 it('restores text on first hydration and protects it from later server refresh',()=>{
  localStorage.setItem(draftKey('test-user','material',10),JSON.stringify({draft:{...fixtures.current,body:'My unsaved text'},base:JSON.stringify(fixtures.current)}));
  const view=render(<MemoryRouter initialEntries={['/content?material=10']}><MaterialCard/></MemoryRouter>);
  expect(screen.getByLabelText('Сценарий')).toHaveValue('My unsaved text');
  fixtures.current={...fixtures.current,body:'New server text',revision:2};
  view.rerender(<MemoryRouter initialEntries={['/content?material=10']}><MaterialCard/></MemoryRouter>);
  expect(screen.getByLabelText('Сценарий')).toHaveValue('My unsaved text');
 });
 it('does not restore another account recovery',()=>{
  localStorage.setItem(draftKey('other-user','material',10),JSON.stringify({draft:{...fixtures.current,body:'Private other draft'},base:JSON.stringify(fixtures.current)}));
  render(<MemoryRouter initialEntries={['/content?material=10']}><MaterialCard/></MemoryRouter>);
  expect(screen.queryByText('Private other draft')).not.toBeInTheDocument();expect(screen.getByText('Server text')).toBeInTheDocument();
 });
});
