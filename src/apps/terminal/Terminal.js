import './Terminal.css';
import Stack from '@mui/material/Stack'

export default function Terminal() {
  return (
    // TODO: draw a representation of where this terminal is on the entire BSP
    <div className="terminal-window">
      {/* add tmux bindings to the minishell, including ability to highlight vertically and horizontally with arrows + copy */}
      <Stack className="bsod">
        <div className="bsod-header">:(</div>  
        <div className="bsod-text">
          Your PC ran into a problem and needs to restart. We're just 
          collecting some error info, and then we'll restart for you.
        </div>
        <div className="bsod-progress">
          -100% complete
        </div>
        <div className="bsod-information">
          For more information about this issue and possible fixes, visit our website.
        </div>
      </Stack>
    </div>
  );
}
