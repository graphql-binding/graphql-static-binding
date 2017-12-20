import { GraphQLObjectType, GraphQLUnionType, GraphQLInputObjectType, GraphQLScalarType, GraphQLEnumType, GraphQLInterfaceType } from "graphql";

export interface Generator {
    Main: (queryType: GraphQLObjectType, mutationType?: GraphQLObjectType | null, subscriptionType?: GraphQLObjectType | null) => string,
    SchemaType?: (queryType: GraphQLObjectType, mutationType?: GraphQLObjectType | null, subscriptionType?: GraphQLObjectType | null) => string,
    RootType?: (type: GraphQLObjectType) => string,
    GraphQLUnionType?: (type: GraphQLUnionType) => string,
    GraphQLInputObjectType?: (type: GraphQLInputObjectType) => string,
    GraphQLObjectType?: (type: GraphQLObjectType) => string,
    GraphQLScalarType?: (type: GraphQLScalarType) => string,
    GraphQLEnumType?: (type: GraphQLEnumType) => string,
    GraphQLInterfaceType?: (type: GraphQLInterfaceType) => string,
  }