import {
  EnvironmentOutlined,
  LoginOutlined,
  UserOutlined,
  WalletOutlined,
} from '@ant-design/icons';
import { Button, Dropdown, Menu, Typography } from 'antd';
import React from 'react';

import useMetamask from '@/hooks/useMetamask';

const Header = () => {
  const { onClickConnect, accounts } = useMetamask();
  const handleMenuClick = () => {};
  const menu = (
    <Menu
      onClick={handleMenuClick}
      items={[
        {
          label: (
            <Typography.Text
              copyable={{ text: accounts[0] }}
              ellipsis
              style={{ width: 150 }}
            >
              {accounts[0]}
            </Typography.Text>
          ),
          key: '1',
          icon: <EnvironmentOutlined />,
        },
        {
          label: (
            <Typography.Text
              copyable={{ text: accounts[0] }}
              ellipsis
              style={{ width: 150 }}
            ></Typography.Text>
          ),
          key: '2',
          icon: <WalletOutlined />,
        },
        {
          label: 'Sign Out',
          key: '3',
          icon: <LoginOutlined />,
        },
      ]}
    />
  );
  return (
    <>
      <div className="py-8 text-right">
        {!accounts ||
          (accounts.length === 0 && (
            <Button
              icon={
                <WalletOutlined
                  style={{ fontSize: 20, verticalAlign: 'top' }}
                />
              }
              size="large"
              onClick={onClickConnect}
            >
              Connect Wallet
            </Button>
          ))}

        {accounts && accounts.length > 0 && (
          <Dropdown.Button
            overlay={menu}
            placement="bottom"
            icon={<UserOutlined />}
            size="large"
          >
            Hello
          </Dropdown.Button>
        )}
      </div>
    </>
  );
};

export default Header;
