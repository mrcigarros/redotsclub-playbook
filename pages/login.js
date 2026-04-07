import { useState } from 'react';
import { useRouter } from 'next/router';

export default function Login() {
  const [pw, setPw] = useState('');
  const [error, setError] = useState(false);
  const router = useRouter();

  function submit(e) {
    e.preventDefault();
    if (pw === 'wewillwin') {
      document.cookie = 'rc_auth=wewillwin; path=/; max-age=604800';
      router.push('/');
    } else {
      setError(true);
    }
  }

  return (
    <div style={{minHeight:'100vh',background:'#000',display:'flex',alignItems:'center',justifyContent:'center',fontFamily:'Montserrat,sans-serif'}}>
      <div style={{width:360,padding:48,border:'1px solid rgba(255,255,255,0.07)',borderRadius:4,background:'#0f0f0f'}}>
        <div style={{marginBottom:32,textAlign:'center'}}>
          <svg width="40" height="40" viewBox="0 0 250 250" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M125.129 0H62.5635V62.5H125.129V0Z" fill="white"/><path d="M125.129 125H62.5635V187.5H125.129V125Z" fill="white"/><path d="M62.565 0H0V62.5H62.565Z" fill="white"/><path d="M62.565 62.5H0V125H62.565V62.5Z" fill="white"/><path d="M62.565 125H0V187.5H62.565V125Z" fill="white"/><path d="M62.565 187.5H0V250H62.565V187.5Z" fill="white"/><path d="M187.698 0H125.133V62.5H187.698V0Z" fill="white"/><path d="M187.565 125H125V187.5H187.565V125Z" fill="white"/><path d="M250 62.5H187.436V125H250V62.5Z" fill="white"/><path d="M187.436 62.5H250C250 27.98 221.953 0 187.436 0V62.5Z" fill="white"/><path d="M250 187.241H187.436V249.742H250V187.241Z" fill="#FF1B64"/><path d="M187.565 187.241H125V249.742H187.565V187.241Z" fill="#FF1B64"/>
          </svg>
          <div style={{color:'white',fontWeight:900,fontSize:16,marginTop:12,letterSpacing:'-0.01em'}}>RedotsClub</div>
          <div style={{color:'#FF1B64',fontSize:9,letterSpacing:'0.3em',textTransform:'uppercase',fontWeight:800,marginTop:4}}>Global Playbook</div>
        </div>
        <form onSubmit={submit}>
          <input
            type="password"
            placeholder="Enter password"
            value={pw}
            onChange={e=>{setPw(e.target.value);setError(false)}}
            style={{width:'100%',padding:'12px 14px',background:'rgba(255,255,255,0.03)',border:`1px solid ${error?'#FF1B64':'rgba(255,255,255,0.08)'}`,borderRadius:3,color:'white',fontFamily:'Montserrat,sans-serif',fontSize:14,outline:'none',marginBottom:12,boxSizing:'border-box'}}
            autoFocus
          />
          {error && <div style={{color:'#FF1B64',fontSize:11,marginBottom:12,letterSpacing:'0.04em'}}>Incorrect password</div>}
          <button type="submit" style={{width:'100%',padding:'12px',background:'#FF1B64',border:'none',borderRadius:3,color:'white',fontFamily:'Montserrat,sans-serif',fontSize:11,fontWeight:900,letterSpacing:'0.14em',textTransform:'uppercase',cursor:'pointer'}}>
            Enter
          </button>
        </form>
      </div>
    </div>
  );
}
