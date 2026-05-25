import re

try:
    product_code = open('c:/Users/mfmss/Documents/nd/admin/product/product.js', 'r', encoding='utf-8').read()

    start = product_code.find('function _initAdminImportDropdown')
    end = product_code.find('function updateProductUILabel()')
    
    if start == -1 or end == -1:
        print('Could not find boundaries')
    else:
        import_code = product_code[start:end]
        rs_code = import_code.replace('adminImport', 'rsImport')
        rs_code = rs_code.replace('adminSpecImport', 'rsSpecImport')
        rs_code = rs_code.replace('adminCustomImport', 'rsCustomImport')
        rs_code = rs_code.replace('adminProducts', 'JSON.parse(localStorage.getItem(\'m_kuad_products_data\') || \'[]\')')
        rs_code = rs_code.replace('adminNewProduct', 'rsNewProduct')
        rs_code = rs_code.replace('adminBulk', 'rsBulk')
        rs_code = rs_code.replace('adminSpec', 'rsSpec')
        rs_code = rs_code.replace('adminCustom', 'rsCustom')
        rs_code = rs_code.replace('updateProductUILabel', 'updateRsProductUILabel')
        rs_code = rs_code.replace('adminApm', 'rs')
        rs_code = rs_code.replace('_initAdmin', '_initRestock')
        
        with open('c:/Users/mfmss/Documents/nd/admin/menu-buttons/restock/restock.js', 'a', encoding='utf-8') as f:
            f.write('\n\n// Added dropdown logic\n')
            f.write(rs_code)
        print('Appended successful')
except Exception as e:
    print(e)
