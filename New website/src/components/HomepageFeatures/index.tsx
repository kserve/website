export default function Home(): JSX.Element {
  return (
    <div className="relative px-6 pt-14 lg:px-8 bg-gradient-to-b from-gray-100 to-white">
      {/* Content */}
      <div className="mx-auto max-w-xl py-16 sm:py-32 lg:py-40">
        {/* Image section */}
        <div className="mb-8 flex justify-center mt-0">
          <img
            src="/img/kserve_layer.png"
            alt="Image"
            className="max-w-full h-auto"
          />
        </div>

        {/* Main text */}
        <div className="text-center">
          <h3 className="text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">
            Highly scalable and standards-based Model Inference Platform on
            Kubernetes for Trusted AI
          </h3>
          <p className="mt-6 text-lg leading-8 text-gray-600">
            Anim aute id magna aliqua ad ad non deserunt sunt. Qui irure qui
            lorem cupidatat commodo. Elit sunt amet fugiat veniam occaecat
            fugiat aliqua.
          </p>

          {/* Call to action */}
          <div className="mt-10 flex items-center justify-center space-x-6">
            <a href="#" className="btn-primary">
              Get started
            </a>
            <a
              href="#"
              className="text-sm font-semibold leading-6 text-gray-900"
            >
              Learn more <span aria-hidden="true">→</span>
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
