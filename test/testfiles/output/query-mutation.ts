import { Graphcool as BaseGraphcool, BaseGraphcoolOptions } from 'graphcool-binding'
import { GraphQLResolveInfo } from 'graphql'

const typeDefs = `
type Query {
    posts: [String]
}`

/*
The `Boolean` scalar type represents `true` or `false`.
*/
export type Boolean = boolean

/*
The `String` scalar type represents textual data, represented as UTF-8 character sequences. The String type is most often used by GraphQL to represent free-form human-readable text.
*/
export type String = string

export interface Schema {
  query: Query
}

export type Query = {
  posts: (args: {}, info?: GraphQLResolveInfo | string) => Promise<Array<String> | null>
}

export class Graphcool extends BaseGraphcool {

  constructor({ endpoint, secret, fragmentReplacements, debug }: BaseGraphcoolOptions) {
    super({ typeDefs, endpoint, secret, fragmentReplacements, debug });
  }

  query: Query = {
    posts: (args, info): Promise<Array<String> | null> => super.delegate('query', 'posts', args, {}, info)
  }
}
