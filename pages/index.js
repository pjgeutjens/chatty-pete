import Head from "next/head";
import { useUser } from "@auth0/nextjs-auth0/client";
import { getSession } from "@auth0/nextjs-auth0";

export default function Home() {
  const { isLoading, error, user } = useUser();

  if (isLoading) return <div>Loading...</div>;
  if (error) return <div>{error.message}</div>;

  return (
    <>
      <Head>
        <title>Chatty Pete - Login or Signup</title>
      </Head>
      <div className="flex justify-center items-center min-h-screen w-full bg-gray-800 text-white text-center">
        <div>
          {!!user ?
            <a href="/api/auth/logout">Logout</a> :
            <>
              <a href="/api/auth/login" className="btn">Login</a>
              <a href="/api/auth/signup" className="btn">Signup</a>
            </>
          }
        </div>
      </div>
    </>


  );
}

export const getServerSideProps = async (ctx) => {
  const session = await getSession(ctx.req, ctx.res);
  if(!!session) {
    return {
      redirect: {
        destination: "/chat"
      }
    }
  }
  return {
    props: {}
  }
}
