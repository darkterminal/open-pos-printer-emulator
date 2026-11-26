import './bootstrap';
import '../css/app.css';

const page = document.querySelector('script[data-page]');
if (page) {
  void import('./inertia-app');
}
