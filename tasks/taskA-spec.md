# Tasklet — ToDo管理 REST API 仕様書

シンプルなマルチユーザー ToDo 管理 REST API「Tasklet」を実装してください。

## 技術要件

- Python 3.11+
- フレームワークは自由(FastAPI 推奨)。ただし以下の起動方法で動作すること:
  - `pip install -r requirements.txt`
  - `python -m uvicorn app.main:app --port 8000`
  - つまり ASGI アプリケーションを `app/main.py` の `app` として公開すること
- データ永続化はインメモリまたは SQLite(再起動で消えてよい)
- 外部サービス・外部APIへの依存は禁止
- 実装に対する自動テストを必ず書くこと(`pytest` で実行できること)
- README.md にセットアップ手順とAPI概要を書くこと

## 共通仕様

- リクエスト/レスポンスは JSON
- バリデーションエラーは **422**、認証エラーは **401**、権限のないリソースへのアクセスは **404**(存在自体を隠す)
- 日時はすべて ISO 8601 文字列(例: `2026-07-01T12:00:00`)

## 認証

### POST /auth/register

リクエスト: `{"username": str, "password": str}`

- `username`: 3〜30文字、半角英数字とアンダースコアのみ。条件違反は 422
- `password`: 8文字以上。条件違反は 422
- 成功: **201** `{"id": int, "username": str}`
- username 重複: **409**

### POST /auth/login

リクエスト: `{"username": str, "password": str}`

- 成功: **200** `{"token": str}`
- 失敗(存在しないユーザー or パスワード不一致): **401**

### 認証方式

- 以降のすべての `/todos` エンドポイントは `Authorization: Bearer <token>` ヘッダ必須
- ヘッダなし・不正トークン: **401**

## ToDo

ToDo オブジェクトの形:

```json
{
  "id": 1,
  "title": "牛乳を買う",
  "description": "低脂肪のやつ",
  "due_date": "2026-07-01T12:00:00",
  "tags": ["buy", "errand"],
  "status": "open",
  "created_at": "2026-06-11T10:00:00"
}
```

### POST /todos

リクエスト: `{"title": str, "description": str?, "due_date": str?, "tags": [str]?}`

- `title`: 必須。前後の空白を **trim した上で** 1〜100文字。空白のみは 422
- `description`: 任意。最大1000文字
- `due_date`: 任意。ISO 8601 としてパースできない文字列は 422。過去日付は許可
- `tags`: 任意。各タグは保存時に **小文字化** し、**重複を除去** する。タグは1〜20文字。重複除去後の個数が **10個を超える場合は 422**
- `status` は常に `"open"` で作成
- 成功: **201** で ToDo オブジェクトを返す

### GET /todos

クエリパラメータ:

| パラメータ | 説明 |
|---|---|
| `status` | `open` / `done` でフィルタ。それ以外の値は 422 |
| `tag` | 指定タグを含む ToDo のみ(比較は小文字化して行う) |
| `q` | `title` または `description` の部分一致検索。**大文字小文字を区別しない** |
| `sort` | `due_date_asc` / `due_date_desc`。`due_date` が null のものは**常に末尾**。それ以外の値は 422。未指定時は `created_at` 昇順 |
| `page` | 1始まり。1未満は 422。デフォルト 1 |
| `per_page` | 1〜100。範囲外は 422。デフォルト 20 |

レスポンス: **200**

```json
{"items": [...], "total": int, "page": int, "per_page": int}
```

- `total` はフィルタ適用後の全件数(ページに関係なく)
- 自分の ToDo のみが対象(他ユーザーのものは見えない)

### GET /todos/{id}

- 成功: **200** で ToDo オブジェクト
- 存在しない、または**他ユーザーの ToDo**: **404**

### PATCH /todos/{id}

リクエスト: 部分更新。`title` / `description` / `due_date` / `tags` / `status` のうち指定されたフィールドのみ更新

- 各フィールドのバリデーションは POST /todos と同じ
- `status`: `"open"` または `"done"` のみ。それ以外は 422
- 成功: **200** で更新後の ToDo オブジェクト
- 存在しない、または他ユーザーの ToDo: **404**

### DELETE /todos/{id}

- 成功: **204**(ボディなし)
- 存在しない、または他ユーザーの ToDo: **404**
