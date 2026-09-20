import { XMLBuilder, XMLParser } from "fast-xml-parser";
import { Form } from "../types/form";

export const exportFormToXML = (schema: Form): { content: string; filename: string } => {
  const builder = new XMLBuilder({
    ignoreAttributes: false,
    format: true,
    arrayNodeName: "item",
  });
  const xmlContent = builder.build({ FormSchema: schema });
  const filename = `schema_${schema.title?.replace(/\s+/g, '_') || 'form'}.xml`;
  return {
    content: "<?xml version=\"1.0\" encoding=\"UTF-8\"?>\n" + xmlContent,
    filename
  };
};

export const parseFormFromXML = (xmlContent: string): Form => {
  const parser = new XMLParser({
    ignoreAttributes: false,
    parseAttributeValue: true,
    isArray: (name: string, jpath: any) => { 
      const path = String(jpath);
      if (['FormSchema.sections', 'FormSchema.sections.questions', 'FormSchema.sections.questions.options', 'FormSchema.sections.questions.sub_question_template.sub_questions'].includes(path)) return true;
      return false;
    }
  });
  const parsed = parser.parse(xmlContent);
  if (parsed && parsed.FormSchema) {
    return parsed.FormSchema as Form;
  }
  throw new Error("Formato XML inválido. Elemento 'FormSchema' não encontrado.");
};

