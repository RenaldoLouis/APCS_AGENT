import docx

doc = docx.Document('APCS_System_Documentation.docx') # original document
table = doc.tables[0]
print("Original Table Style:", table.style.name)
