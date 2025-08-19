import { redirect } from "next/navigation";

import { getSession } from "~/auth/server";
import Login from "./Login";

const LoginPage = async () => {
  const session = await getSession();
  if (session?.user) {
    redirect("/");
  } else {
    return <Login />;
  }
};

export default LoginPage;
