import ReactDOM from 'react-dom/client';
import './index.css';
import Router from './Router';
import reportWebVitals from './reportWebVitals';
import { BrowserRouter } from 'react-router-dom';
import { boot } from './kernel';

const root = ReactDOM.createRoot(document.getElementById('root'));
// first boot the os kernel, then render desktop
boot.then(() => {
  root.render(
    <BrowserRouter>
      <Router />
    </BrowserRouter>
  );
});

// If you want to start measuring performance in your app, pass a function
// to log results (for example: reportWebVitals(console.log))
// or send to an analytics endpoint. Learn more: https://bit.ly/CRA-vitals
reportWebVitals();
