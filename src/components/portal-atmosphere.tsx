export function PortalAtmosphere() {
  return (
    <div className="portal-waves" aria-hidden="true">
      <svg className="portal-wave portal-wave-top" viewBox="0 0 2880 320" preserveAspectRatio="none">
        <path fill="currentColor" d="M0 180C240 120 480 240 720 180C960 120 1200 240 1440 180C1680 120 1920 240 2160 180C2400 120 2640 240 2880 180V320H0Z" />
      </svg>
      <svg className="portal-wave portal-wave-back" viewBox="0 0 2880 320" preserveAspectRatio="none">
        <path fill="currentColor" d="M0 160C180 220 360 100 540 160C720 220 900 100 1080 160C1260 220 1440 100 1620 160C1800 220 1980 100 2160 160C2340 220 2520 100 2700 160C2790 190 2835 175 2880 160V320H0Z" />
      </svg>
      <svg className="portal-wave portal-wave-front" viewBox="0 0 2880 320" preserveAspectRatio="none">
        <path fill="currentColor" d="M0 200C240 140 480 250 720 200C960 150 1200 250 1440 200C1680 150 1920 250 2160 200C2400 150 2640 250 2880 200V320H0Z" />
      </svg>
    </div>
  );
}
