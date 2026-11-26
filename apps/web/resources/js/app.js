import './bootstrap';
import '../css/app.css';

const page = document.querySelector('[data-inertia-page]');
if (page) {
  void import('./inertia-app');
}
