import { DocumentNode, Kind, ObjectTypeDefinitionNode, OperationTypeDefinitionNode, parse } from 'graphql';
import { GraphQLSchema } from 'graphql/type/schema';
import { buildASTSchema } from 'graphql/utilities/buildASTSchema';
import { generators } from './generators'
import { Generator } from './types'

export { Generator } from './types'

export function generateCode(schema: string, generator: Generator | string): string {
    if (typeof generator === 'string'){
      generator = generators[generator] || require(generator).generator
      if (!generator) {
        throw new Error(`Generator '${generator}' could not be found. Available generators:
${Object.keys(generators).map(k => `'${k}`).join(', ')}`)
      }
    }

    const document: DocumentNode = parse(schema, { noLocation: true })
    const ast: GraphQLSchema = buildASTSchema(document)
 
    // Create types
    const typeNames = Object
      .keys(ast.getTypeMap())
      .filter(typeName => !typeName.startsWith('__'))
      .filter(typeName => typeName !== ast.getQueryType().name)
      .filter(typeName => ast.getMutationType() ? typeName !== ast.getMutationType()!.name : true)
      .filter(typeName => ast.getSubscriptionType() ? typeName !== ast.getSubscriptionType()!.name : true)
      .sort((a,b) => ast.getType(a).constructor.name < ast.getType(b).constructor.name ? -1 : 1)
    
    // Special case 4: header
    const generatedClass = [generator.Header(schema)]

    // Process all types
    generatedClass.push(...typeNames.map(typeName => {
      const type = ast.getTypeMap()[typeName]
      return generator[type.constructor.name] ? generator[type.constructor.name](type) : null
    }))

    // Special case 1: generate schema interface
    if (generator.SchemaType) {
      generatedClass.push(generator.SchemaType(ast.getQueryType(), ast.getMutationType(), ast.getSubscriptionType()))
    }

    // Special case 2: generate root field interfaces
    if (generator.RootType) {
      generatedClass.push(generator.RootType(ast.getQueryType()))
      if (ast.getMutationType()) { generatedClass.push(generator.RootType(ast.getMutationType()!)) }
    }

    // Special case 5: subscription type
    if (generator.SubscriptionType) {
      if (ast.getSubscriptionType()) { generatedClass.push(generator.SubscriptionType(ast.getSubscriptionType()!)) }
    }

    // Special case 3: the main method
    generatedClass.push(generator.Main(ast.getQueryType(), ast.getMutationType(), ast.getSubscriptionType()))

    return generatedClass.filter(r => r).join('\n\n')
}
