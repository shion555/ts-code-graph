// 型エイリアスとインターフェースのテストケース

// 型エイリアス（ノードとして抽出されない）
export type UserId = string;

export type UserData = {
  id: UserId;
  name: string;
  age: number;
};

// インターフェース（ノードとして抽出されない）
export interface IUser {
  id: UserId;
  getName(): string;
}

export interface IUserService {
  getUser(id: UserId): IUser;
  saveUser(user: IUser): void;
}

// インターフェースを実装するクラス（ノードとして抽出される）
export class UserService implements IUserService {
  getUser(id: UserId): IUser {
    return {
      id,
      getName: () => "User",
    };
  }

  saveUser(user: IUser): void {
    console.log(`Saving user: ${user.getName()}`);
  }
}

// 型を使用する関数（ノードとして抽出される）
export function processUserData(data: UserData): string {
  return `${data.name} (${data.age})`;
}
