import useDocumentTitle from "../lib/useDocumentTitle";


export default function Credits() {

  useDocumentTitle("Credits");

  return (
    <div>
      <h1 className="page-title">Credits</h1>

      <p className="page-intro">
        Who made what.
      </p>
    </div>
  );
}
