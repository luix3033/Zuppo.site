import {Component,type ReactNode} from 'react';
export class ErrorBoundary extends Component<{children:ReactNode},{failed:boolean}>{
 state={failed:false};
 static getDerivedStateFromError(){return {failed:true};}
 render(){
  if(this.state.failed)return <main className="container info-page"><div className="empty-state" role="alert"><img className="empty-mascot error-mascot" src="/images/zuppinho-erro.png" alt="Zuppinho encontrou um problema" width="190" height="190"/><h1>Opa, tivemos um imprevisto.</h1><p>Recarregue a página para tentar novamente.</p><button className="btn btn-primary" onClick={()=>window.location.reload()}>Tentar novamente</button><a className="text-link" href="/">Voltar ao início</a></div></main>;
  return this.props.children;
 }
}
