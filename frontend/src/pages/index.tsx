import useEth from '@/hooks/useEth';
import { Meta } from '@/layouts/Meta';
import { Main } from '@/templates/Main';

const Index = () => {
  const { web3 } = useEth();
  return (
    <Main meta={<Meta title="Home Page" description="DApp for test" />}>
      <h1>Hello </h1>
    </Main>
  );
};

export default Index;
