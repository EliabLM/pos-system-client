'use client';

import React, { useState } from 'react';
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { DataTable } from './data-table';
import { Button } from '@/components/ui/button';
import { Sheet } from '@/components/ui/sheet';

import { useUsers } from '@/hooks/useUsers';
import { User } from '@/generated/prisma';
import { useStore } from '@/store';

import NewUser from './new-user';

const UsersList = () => {
  const users = useUsers();
  const currentUser = useStore((state) => state.user);

  const [sheetOpen, setSheetOpen] = useState(false);
  const [itemSelected, setItemSelected] = useState<User | null>(null);

  const isAdmin = currentUser?.role === 'ADMIN';

  return (
    <div className="@container/main flex flex-1 flex-col gap-2">
      <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
        <div className="px-4 lg:px-6">
          <Card className="@container/card">
            <CardHeader>
              <CardTitle>Usuarios</CardTitle>
              <CardDescription>
                <span className="hidden @[540px]/card:block">
                  Listado de todos los usuarios
                </span>
              </CardDescription>

              <CardAction>
                {isAdmin && (
                  <Button
                    disabled
                    onClick={() => {
                      setItemSelected(null);
                      // setSheetOpen(true);
                    }}
                  >
                    Crear nuevo usuario
                  </Button>
                )}
                <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
                  <NewUser
                    setSheetOpen={setSheetOpen}
                    itemSelected={itemSelected}
                    setItemSelected={setItemSelected}
                  />
                </Sheet>
              </CardAction>
            </CardHeader>
            <CardContent>
              <DataTable
                loading={users.isLoading}
                data={users.data ?? []}
                setSheetOpen={setSheetOpen}
                setItemSelected={setItemSelected}
              />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default UsersList;
