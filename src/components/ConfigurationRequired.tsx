import { Helmet } from "react-helmet-async";
import BrandLogo from "./BrandLogo";

export default function ConfigurationRequired() {
  return (
    <main className="grid min-h-screen place-items-center bg-[#090909] px-5 text-center">
      <Helmet>
        <title>Deployment configuration required</title>
        <meta name="robots" content="noindex, nofollow" />
      </Helmet>
      <div className="max-w-xl">
        <BrandLogo className="mx-auto h-28 w-28" priority />
        <p className="eyebrow mt-7">DARAJNI Designer House</p>
        <h1 className="font-display mt-4 text-5xl sm:text-6xl">Deployment configuration required</h1>
        <p className="mx-auto mt-6 max-w-lg text-sm leading-7 text-white/50">
          This application does not include local accounts or sample catalog records. Connect
          a deployed Supabase project through the required environment variables to use it.
        </p>
      </div>
    </main>
  );
}
