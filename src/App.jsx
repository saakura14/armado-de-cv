import Header from './components/Header';
import Hero from './components/Hero';
import About from './components/About';
import Catalog from './components/Catalog';
import Process from './components/Process';
import Testimonials from './components/Testimonials';
import ContactForm from './components/ContactForm';
import FuturoCVForm from './components/FuturoCVForm'; // <-- LÍNEA CORREGIDA
import Footer from './components/Footer';
import WhatsAppButton from './components/WhatsAppButton';

function App() {
  return (
    <div className="bg-beige-claro font-sans text-gris-oscuro">
      <Header />
      <main>
        <Hero />
        <About />
        <Catalog />
        <Process />
        <Testimonials />
        <ContactForm />
        <FuturoCVForm /> {/* <-- LÍNEA CORREGIDA */}
      </main>
      <Footer />
      <WhatsAppButton />
    </div>
  );
}

export default App;

