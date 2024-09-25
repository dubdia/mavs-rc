import docsLeft from '../assets/gradients/docs-left.png';
import docsRight from '../assets/gradients/docs-right.png';

export const Background = () => {
  return (
    <div className="animate-fade select-none">
      <div aria-hidden="true" className="fixed dark:opacity-70 -bottom-[40%] -left-[20%] z-0">
        <img
          src={docsLeft}
          className="relative z-10 opacity-0 shadow-black/5 data-[loaded=true]:opacity-100 shadow-none transition-transform-opacity motion-reduce:transition-none !duration-300 rounded-large"
          alt="docs left background"
          data-loaded="true"
        />
      </div>
      <div
        aria-hidden="true"
        className="fixed dark:opacity-70 -top-[80%] -right-[60%] 2xl:-top-[60%] 2xl:-right-[45%] z-0 rotate-12"
      >
        <img
          src={docsRight}
          className="relative z-10 opacity-0 shadow-black/5 data-[loaded=true]:opacity-100 shadow-none transition-transform-opacity motion-reduce:transition-none !duration-300 rounded-large"
          alt="docs right background"
          data-loaded="true"
        />
      </div>
    </div>
  );
};
