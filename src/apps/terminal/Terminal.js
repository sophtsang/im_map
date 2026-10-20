// placeholder until the W4 shell: just proves a tiled window renders an app
export default function Terminal() {
  return (
    <div style={{ fontFamily: 'monospace', padding: 8 }}>
      minishell $ <span className="cursor">_</span>
    </div>
  );
}
